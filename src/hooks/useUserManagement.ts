import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Association } from '../types/auth';
import { Role } from '../types/roles';

export interface UserWithDetails {
  id: string;
  email: string;
  profile: {
    id: string;
    primary_association_id: string;
    first_name: string;
    last_name: string;
    created_at: string;
  };
  memberships: Array<{
    id: string;
    association_id: string;
    is_active: boolean;
    joined_at: string;
    association: Association;
  }>;
  primaryAssociation: Association;
  roles: Role[];
}

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  associationId: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  associationId?: string;
}

export function useUserManagement() {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && hasPermission('manage_users')) {
      loadData();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all users with their profiles and associations
      await Promise.all([
        loadUsers(),
        loadAssociations(),
        loadRoles()
      ]);
    } catch (err: any) {
      console.error('Error loading user management data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles) {
      setUsers([]);
      return;
    }

    const userIds = profiles.map(p => p.user_id);

    // Get all user association memberships
    const { data: userMemberships, error: membershipsError } = await supabase
      .from('user_association_memberships')
      .select(`
        id,
        user_id,
        association_id,
        is_active,
        joined_at,
        associations!inner (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          phone,
          email,
          website,
          created_at
        )
      `)
      .in('user_id', userIds)
      .eq('is_active', true);

    if (membershipsError) {
      console.warn('Could not load user memberships:', membershipsError);
    }

    // Get all associations referenced in profiles for primary associations
    const primaryAssociationIds = [...new Set(profiles.map(p => p.association_id).filter(id => id != null))];
    const { data: primaryAssociations, error: associationsError } = await supabase
      .from('associations')
      .select('*')
      .in('id', primaryAssociationIds);

    if (associationsError) {
      console.warn('Could not load associations:', associationsError);
    }

    // Call edge function to get auth users
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
    
    const headers = {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
    
    const response = await fetch(apiUrl, { headers });
    let authUsers: any[] = [];
    
    if (response.ok) {
      const result = await response.json();
      authUsers = result.users || [];
    } else {
      console.warn('Could not load auth users via edge function, using profile data only');
    }

    // Get role assignments for all users
    const { data: roleAssignments, error: rolesError } = await supabase
      .from('user_role_assignments')
      .select(`
        user_id,
        roles (
          id,
          name,
          description,
          permissions,
          is_system_role,
          association_id,
          created_at,
          updated_at
        )
      `)
      .in('user_id', userIds);

    if (rolesError) {
      console.warn('Could not load role assignments:', rolesError);
    }

    // Combine the data
    const usersWithDetails: UserWithDetails[] = profiles.map(profile => {
      const authUser = authUsers.find(u => u.id === profile.user_id);
      const userRoleAssignments = roleAssignments?.filter(ra => ra.user_id === profile.user_id) || [];
      const userRoles: Role[] = userRoleAssignments.flatMap(ra => ra.roles ? ra.roles : []);
      
      // Get user's memberships
      const profileMemberships = userMemberships?.filter(m => m.user_id === profile.user_id) || [];
      
      // Get primary association
      const primaryAssociation = primaryAssociations?.find(a => a.id === profile.association_id) || associations[0];

      return {
        id: profile.user_id,
        email: authUser?.email || 'Contact user directly',
        profile: {
          id: profile.id,
          primary_association_id: profile.association_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at,
        },
        memberships: profileMemberships.map(m => ({
          id: m.id,
          association_id: m.association_id,
          is_active: m.is_active,
          joined_at: m.joined_at,
          association: m.associations as unknown as Association,
        })),
        primaryAssociation,
        roles: userRoles,
      };
    });

    setUsers(usersWithDetails);
  };

  const loadAssociations = async () => {
    const { data, error } = await supabase
      .from('associations')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    setAssociations(data || []);
  };

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    setRoles(data || []);
  };

  const createUser = async (userData: CreateUserData) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    console.log('Creating user with data:', userData);

    try {
      // Call the edge function to create user with admin privileges
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };
      
      console.log('Making request to:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          associationId: userData.associationId,
        }),
      });
      
      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Response result:', result);
      
      if (!response.ok) {
        console.error('HTTP error creating user:', response.status, result);
        throw new Error(result.error || 'Failed to create user');
      }
      
      if (!result.success) {
        console.error('API error creating user:', result);
        throw new Error(result.error || 'Failed to create user');
      }

      console.log('User created successfully, reloading users...');
      // Reload users to get the new user
      await loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      throw new Error((err as Error).message);
    }
  };

  const updateUser = async (userId: string, userData: UpdateUserData) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Build update object with only defined fields
      const updateData: any = {};
      if (userData.firstName !== undefined) updateData.first_name = userData.firstName;
      if (userData.lastName !== undefined) updateData.last_name = userData.lastName;

      console.log('Updating user:', userId, 'with data:', updateData);
      console.log('Current user roles:', user.roles?.map(r => r.name));
      console.log('Current user permissions:', user.permissions);

      // First, check if the user exists and get their current data
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId);

      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
      }

      if (!existingProfile || existingProfile.length === 0) {
        throw new Error('User profile not found');
      }

      console.log('Existing profile:', existingProfile[0]);

      // Check if current user is Super Admin
      const isSuperAdmin = user.roles?.some(role => 
        role.name === 'Super Admin' && role.is_system_role === true
      );

      console.log('Is Super Admin?', isSuperAdmin);

      if (!isSuperAdmin && userId !== user.id) {
        throw new Error('Only Super Admins can update other users\' profiles');
      }

      // Only update if there are actual changes to make
      if (Object.keys(updateData).length === 0) {
        console.log('No profile changes to make');
        
        // Handle association change separately if needed
        if (userData.associationId !== undefined) {
          await handleAssociationChange(userId, userData.associationId);
        }
        
        return;
      }
      // Try the update
      const { data: updatedData, error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select();

      if (updateError) {
        console.error('Supabase update error:', updateError);
        console.error('Update error code:', updateError.code);
        console.error('Update error details:', updateError.details);
        console.error('Update error hint:', updateError.hint);
        
        if (updateError.code === 'PGRST301' || updateError.message?.includes('permission denied')) {
          throw new Error('Permission denied: You may not have the required role to update user profiles. Please ensure you have Super Admin privileges.');
        } else if (updateError.code === 'PGRST116') {
          throw new Error('User profile not found or no changes made');
        } else {
          throw new Error(`Database update failed: ${updateError.message}`);
        }
      }

      if (!updatedData || updatedData.length === 0) {
        throw new Error('No user profile was updated. This may be due to insufficient permissions or the profile not existing.');
      }

      console.log('User updated successfully:', updatedData[0]);
      
      // Handle association change separately if needed
      if (userData.associationId !== undefined) {
        await handleAssociationChange(userId, userData.associationId);
      }
      
      // Reload users to get the updated data
      await loadUsers();
    } catch (err) {
      console.error('Error in updateUser:', err);
      throw err instanceof Error ? err : new Error('Failed to update user: ' + String(err));
    }
  };

  const handleAssociationChange = async (userId: string, newAssociationId: string) => {
    try {
      console.log('Handling association change for user:', userId, 'to association:', newAssociationId);
      
      // Check if user already has membership in this association
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('user_association_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('association_id', newAssociationId)
        .single();
      
      if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
        console.error('Error checking existing membership:', membershipCheckError);
        throw new Error('Failed to check association membership');
      }
      
      if (existingMembership) {
        console.log('User already has membership in this association');
        return;
      }
      
      // Add user to new association
      const { error: membershipError } = await supabase
        .from('user_association_memberships')
        .insert({
          user_id: userId,
          association_id: newAssociationId,
          is_active: true
        });
      
      if (membershipError) {
        console.error('Error creating association membership:', membershipError);
        throw new Error('Failed to update user association');
      }
      
      console.log('Successfully added user to new association');
    } catch (err) {
      console.error('Error in handleAssociationChange:', err);
      throw err;
    }
  };
  const deleteUser = async (userId: string) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Call edge function for user deletion
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      // Reload users to reflect the deletion
      await loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      throw new Error((err as Error).message);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: user.id,
        });

      if (error) {
        throw error;
      }

      // Reload users to reflect the role assignment
      await loadUsers();
    } catch (err) {
      throw new Error('Failed to assign role: ' + (err as Error).message);
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        throw error;
      }

      // Reload users to reflect the role removal
      await loadUsers();
    } catch (err) {
      throw new Error('Failed to remove role: ' + (err as Error).message);
    }
  };

  const addUserToAssociation = async (userId: string, associationId: string) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Check if membership already exists
      const { data: existingMembership, error: checkError } = await supabase
        .from('user_association_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('association_id', associationId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingMembership) {
        throw new Error('User is already a member of this association');
      }

      const { error } = await supabase
        .from('user_association_memberships')
        .insert({
          user_id: userId,
          association_id: associationId,
          is_active: true,
        });

      if (error) {
        throw error;
      }

      // Reload users to reflect the new membership
      await loadUsers();
    } catch (err) {
      throw new Error('Failed to add user to association: ' + (err as Error).message);
    }
  };

  const removeUserFromAssociation = async (membershipId: string) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { error } = await supabase
        .from('user_association_memberships')
        .update({ is_active: false })
        .eq('id', membershipId);

      if (error) {
        throw error;
      }

      // Reload users to reflect the membership removal
      await loadUsers();
    } catch (err) {
      throw new Error('Failed to remove user from association: ' + (err as Error).message);
    }
  };

  return {
    users,
    associations,
    roles,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    assignRole,
    removeRole,
    addUserToAssociation,
    removeUserFromAssociation,
    refetch: loadData,
  };
}