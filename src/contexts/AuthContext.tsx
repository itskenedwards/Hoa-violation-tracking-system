import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthUser, UserProfile, Association, AssociationMembership } from '../types/auth';
import { Role, Permission } from '../types/roles';
import { AuthContext, AuthContextType } from './AuthContextInternal';

// Local storage key for storing current association
const CURRENT_ASSOCIATION_KEY = 'currentAssociationId';

// Debug logs for visual display
export const debugLogs: string[] = [];
const addDebugLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  debugLogs.unshift(`${timestamp}: ${message}`);
  if (debugLogs.length > 20) debugLogs.pop(); // Keep last 20 logs
  console.log(message);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Update debug info state when debugLogs changes
  useEffect(() => {
    const interval = setInterval(() => {
      setDebugInfo([...debugLogs]);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Function to completely clear authentication state
  const clearAuthState = async () => {
    addDebugLog('🧹 Clearing all authentication state...');
    
    try {
      setUser(null);
      setProfileLoadError(null);
      setLoading(false);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('Authentication state cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing auth state:', error);
      return false;
    }
  };

  // Simplified profile loading with aggressive timeout
  const loadUserProfile = async (authUser: User) => {
    addDebugLog(`👤 Loading profile for: ${authUser.email}`);
    setLoading(true);
    setProfileLoadError(null);
    
    // Set absolute maximum timeout - clear loading no matter what
    const absoluteTimeout = setTimeout(() => {
      addDebugLog('⏰ ABSOLUTE TIMEOUT - clearing loading state');
      setLoading(false);
      setProfileLoadError('Authentication is taking too long. Please refresh the page and try again.');
    }, 15000); // 15 second absolute maximum
    
    try {
      // Load profile with simple timeout
      addDebugLog('👤 Querying user profile...');
      
      const profilePromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      const profileTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 5000)
      );
      
      const profileResult = await Promise.race([profilePromise, profileTimeout]) as any;
      
      if (profileResult.error) {
        clearTimeout(absoluteTimeout);
        addDebugLog(`👤 Profile error: ${profileResult.error.message}`);
        setLoading(false);
        
        if (profileResult.error.code === 'PGRST116') {
          setProfileLoadError('No user profile found. Please sign up or contact support.');
        } else {
          setProfileLoadError('Failed to load user profile. Please try again.');
        }
        return;
      }
      
      const profile = profileResult.data;
      if (!profile) {
        clearTimeout(absoluteTimeout);
        addDebugLog('👤 No profile data returned');
        setLoading(false);
        setProfileLoadError('No user profile found. Please sign up or contact support.');
        return;
      }
      
      addDebugLog(`👤 Profile loaded: ${profile.first_name} ${profile.last_name}`);
      
      // Load associations with timeout
      addDebugLog('👤 Loading associations...');
      
      const associationsPromise = supabase
        .from('user_association_memberships')
        .select(`
          id,
          association_id,
          is_active,
          joined_at,
          created_at,
          associations!inner (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true);
      
      const associationsTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Associations query timeout')), 5000)
      );
      
      const associationsResult = await Promise.race([associationsPromise, associationsTimeout]) as any;
      
      if (associationsResult.error) {
        clearTimeout(absoluteTimeout);
        addDebugLog(`👤 Associations error: ${associationsResult.error.message}`);
        setLoading(false);
        setProfileLoadError('Failed to load your associations. Please try again.');
        return;
      }
      
      const memberships = associationsResult.data;
      if (!memberships || memberships.length === 0) {
        clearTimeout(absoluteTimeout);
        addDebugLog('👤 No associations found');
        setLoading(false);
        setProfileLoadError('No associations found for your account. Contact support.');
        return;
      }
      
      addDebugLog(`👤 Found ${memberships.length} associations`);
      
      // Extract associations from memberships
      const associations: Association[] = memberships.map((m: any) => m.associations);
      const userMemberships: AssociationMembership[] = memberships.map((m: any) => ({
        id: m.id,
        user_id: authUser.id,
        association_id: m.association_id,
        is_active: m.is_active,
        joined_at: m.joined_at,
        created_at: m.created_at,
      }));
      
      // Determine current association
      let currentAssociation = associations[0];
      const storedAssociationId = localStorage.getItem(CURRENT_ASSOCIATION_KEY);
      if (storedAssociationId) {
        const foundAssociation = associations.find(a => a.id === storedAssociationId);
        if (foundAssociation) {
          currentAssociation = foundAssociation;
        }
      }
      
      // Load roles (with simpler query and timeout)
      addDebugLog('👤 Loading roles...');
      
      const rolesPromise = supabase
        .from('user_role_assignments')
        .select(`
          role_id,
          roles!inner (
            id,
            name,
            description,
            permissions,
            is_system_role,
            association_id
          )
        `)
        .eq('user_id', authUser.id);
      
      const rolesTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Roles query timeout')), 5000)
      );
      
      let roles: Role[] = [];
      try {
        const rolesResult = await Promise.race([rolesPromise, rolesTimeout]) as any;
        if (!rolesResult.error && rolesResult.data) {
          roles = rolesResult.data.map((ra: any) => ra.roles);
        }
      } catch (error) {
        addDebugLog(`👤 Roles loading failed (continuing without roles): ${error}`);
        // Continue without roles rather than failing
      }
      
      addDebugLog(`👤 Loaded ${roles.length} roles`);
      
      // Extract permissions
      const permissions: Permission[] = Array.from(
        new Set(
          roles.flatMap(role => role.permissions as Permission[])
        )
      );
      
      const authUserData: AuthUser = {
        id: authUser.id,
        email: authUser.email!,
        profile: profile as UserProfile,
        associations,
        currentAssociation,
        memberships: userMemberships,
        roles,
        permissions,
      };
      
      clearTimeout(absoluteTimeout);
      addDebugLog(`✅ SUCCESS! User loaded: ${authUserData.email}`);
      setUser(authUserData);
      setProfileLoadError(null);
      setLoading(false);
      
    } catch (error: any) {
      clearTimeout(absoluteTimeout);
      addDebugLog(`❌ Profile loading error: ${error.message}`);
      setLoading(false);
      
      if (error.message?.includes('timeout')) {
        setProfileLoadError('Connection timeout. This may be due to slow internet or server issues. Please check your connection and try again.');
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        setProfileLoadError('Network connection error. Please check your internet connection and try again.');
      } else {
        setProfileLoadError('Failed to load user profile. Please try refreshing the page.');
      }
    }
  };

  // Simplified authentication initialization
  useEffect(() => {
    // Only run auth initialization once per session
    if (authInitialized) {
      return;
    }

    let mounted = true;
    
    const initializeAuth = async () => {
      addDebugLog('🔄 Starting auth initialization...');
      
      // Set absolute timeout for entire initialization
      const initTimeout = setTimeout(() => {
        if (mounted) {
          addDebugLog('⏰ Auth initialization timeout');
          setLoading(false);
          setProfileLoadError(null); // Don't set error, just show login
        }
      }, 10000); // 10 second timeout for initial check
      
      try {
        // Simple session check with timeout
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 8000)
        );
        
        const sessionResult = await Promise.race([sessionPromise, sessionTimeout]) as any;
        const { data: { session }, error } = sessionResult;
        
        clearTimeout(initTimeout);
        
        if (!mounted) return;
        
        if (error) {
          addDebugLog(`❌ Session error: ${error.message}`);
          setLoading(false);
          setAuthInitialized(true);
          return;
        }
        
        if (session?.user) {
          addDebugLog(`🔑 Found session for: ${session.user.email}`);
          await loadUserProfile(session.user);
        } else {
          addDebugLog('❌ No session found');
          setLoading(false);
        }
        
        setAuthInitialized(true);
      } catch (error: any) {
        clearTimeout(initTimeout);
        addDebugLog(`❌ Auth init error: ${error.message}`);
        
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
          if (error.message?.includes('timeout')) {
            setProfileLoadError('Connection timeout during startup. Please refresh the page.');
          }
          // For other errors, just show login without error message
        }
      }
    };
    
    initializeAuth();
    
    // Listen for auth state changes (only after initialization)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Only process auth changes after initial setup
      if (!authInitialized) return;
      
      addDebugLog(`🔄 Auth event: ${event}`);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' && session?.user) {
        addDebugLog('✅ User signed in');
        await loadUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        addDebugLog('👋 User signed out');
        setUser(null);
        setProfileLoadError(null);
        setLoading(false);
        setAuthInitialized(false); // Reset for next auth flow
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authInitialized]);

  const refetchUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await loadUserProfile(authUser);
      }
    } catch (error: any) {
      console.error('Error refetching user:', error);
      setProfileLoadError('Unable to refresh user data.');
    }
  };

  const clearProfileLoadError = () => {
    setProfileLoadError(null);
  };

  const switchAssociation = async (associationId: string) => {
    if (!user) return;
    
    const association = user.associations.find(a => a.id === associationId);
    if (!association) {
      console.error('Association not found:', associationId);
      return;
    }

    localStorage.setItem(CURRENT_ASSOCIATION_KEY, associationId);
    
    setUser(prev => prev ? {
      ...prev,
      currentAssociation: association
    } : null);

    console.log('Switched to association:', association.name);
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    
    const currentAssociationRoles = user.roles.filter(role => 
      role.is_system_role || role.association_id === user.currentAssociation.id
    );
    
    const permissions = currentAssociationRoles.flatMap(role => role.permissions as Permission[]);
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const signIn = async (email: string, password: string) => {
    try {
      addDebugLog(`🔑 Signing in: ${email}`);
      setProfileLoadError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        addDebugLog(`🔑 Sign in error: ${error.message}`);
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password. Please check your credentials and try again.' };
        } else {
          return { error: error.message };
        }
      }

      addDebugLog('🔑 Sign in successful');
      return { error: null };
    } catch (error: any) {
      addDebugLog(`🔑 Sign in exception: ${error.message}`);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, associationId: string) => {
    try {
      console.log('Starting sign up process for:', email);
      setProfileLoadError(null);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        return { error: authError.message };
      }

      if (!authData.user) {
        return { error: 'Failed to create user account' };
      }

      // Use RPC function to create profile and membership
      const { data: profileResult, error: functionError } = await supabase
        .rpc('create_user_and_membership', {
          p_user_id: authData.user.id,
          p_association_id: associationId,
          p_first_name: firstName,
          p_last_name: lastName
        })
        .single() as { data: any; error: any };

      if (functionError) {
        console.error('Profile creation error:', functionError);
        return { error: `Failed to create user profile: ${functionError.message}` };
      }

      if (profileResult && !profileResult.success) {
        return { error: profileResult.error || 'Failed to create user profile' };
      }

      return { error: null };
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      await clearAuthState();
    } catch (error: any) {
      console.error('Error signing out:', error);
      await clearAuthState();
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    profileLoadError,
    debugInfo,
    signIn,
    signUp,
    signOut,
    hasPermission,
    hasAnyPermission,
    refetchUser,
    clearProfileLoadError,
    clearAuthState,
    switchAssociation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}