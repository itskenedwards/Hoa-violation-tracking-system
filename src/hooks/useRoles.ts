import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Role, UserRoleAssignment } from '../types/roles';

export function useRoles() {
  const { user, hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleAssignments, setUserRoleAssignments] = useState<UserRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && hasPermission('manage_roles')) {
      loadRoles();
      loadUserRoleAssignments();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const loadRoles = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`association_id.eq.${user.currentAssociation.id},is_system_role.eq.true`)
        .order('is_system_role', { ascending: false })
        .order('name');

      if (error) {
        setError(error.message);
        return;
      }

      setRoles(data || []);
    } catch (err) {
      setError('Failed to load roles');
    }
  };

  const loadUserRoleAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .select(`
          *,
          roles (*)
        `)
        .in('user_id', [user.id]); // Can be expanded to include other users in the association

      if (error) {
        setError(error.message);
        return;
      }

      setUserRoleAssignments(data || []);
    } catch (err) {
      setError('Failed to load user role assignments');
    } finally {
      setLoading(false);
    }
  };

  const createRole = async (roleData: {
    name: string;
    description?: string;
    permissions: string[];
  }) => {
    if (!user || !hasPermission('manage_roles')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: roleData.name,
          description: roleData.description,
          permissions: roleData.permissions,
          association_id: user.currentAssociation.id,
          is_system_role: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setRoles(prev => [...prev, data]);
      return data;
    } catch (err) {
      throw new Error('Failed to create role');
    }
  };

  const updateRole = async (roleId: string, roleData: {
    name?: string;
    description?: string;
    permissions?: string[];
  }) => {
    if (!user || !hasPermission('manage_roles')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { data, error } = await supabase
        .from('roles')
        .update({
          ...roleData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleId)
        .eq('association_id', user.currentAssociation.id)
        .eq('is_system_role', false)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setRoles(prev => prev.map(role => role.id === roleId ? data : role));
      return data;
    } catch (err) {
      throw new Error('Failed to update role');
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!user || !hasPermission('manage_roles')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)
        .eq('association_id', user.currentAssociation.id)
        .eq('is_system_role', false);

      if (error) {
        throw error;
      }

      setRoles(prev => prev.filter(role => role.id !== roleId));
    } catch (err) {
      throw new Error('Failed to delete role');
    }
  };

  const assignRoleToUser = async (userId: string, roleId: string) => {
    if (!user || !hasPermission('manage_users')) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { data, error } = await supabase
        .from('user_role_assignments')
        .insert({
          user_id: userId,
          role_id: roleId,
          assigned_by: user.id,
        })
        .select(`
          *,
          roles (*)
        `)
        .single();

      if (error) {
        throw error;
      }

      setUserRoleAssignments(prev => [...prev, data]);
      return data;
    } catch (err) {
      throw new Error('Failed to assign role to user');
    }
  };

  const removeRoleFromUser = async (userId: string, roleId: string) => {
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

      setUserRoleAssignments(prev => 
        prev.filter(assignment => 
          !(assignment.user_id === userId && assignment.role_id === roleId)
        )
      );
    } catch (err) {
      throw new Error('Failed to remove role from user');
    }
  };

  return {
    roles,
    userRoleAssignments,
    loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,
    refetch: () => {
      loadRoles();
      loadUserRoleAssignments();
    },
  };
}