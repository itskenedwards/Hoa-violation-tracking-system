/*
  # Fix infinite recursion in user_role_assignments table

  1. Problem
    - RLS policies on user_role_assignments table cause infinite recursion
    - Policies check permissions by querying the same table they protect
    - This creates circular dependency when loading user profiles

  2. Solution
    - Create completely non-recursive policies for user_role_assignments
    - Use direct user_id checks and association membership without permission checks
    - Create separate SECURITY DEFINER functions that bypass RLS for permission checking
    - Eliminate ALL references to user_role_assignments within its own policies

  3. Approach
    - Drop all existing policies on user_role_assignments
    - Create simple, direct policies that only use user_id and association membership
    - Use SECURITY DEFINER functions for complex permission checks outside of RLS
*/

-- Step 1: Create SECURITY DEFINER functions that bypass RLS completely

-- Function to check if user is super admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_user_super_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Direct query to user_role_assignments without RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id
    AND r.name = 'Super Admin'
    AND r.is_system_role = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to get user accessible associations (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_associations_direct(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(association_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- If user is super admin, return all associations
  IF is_user_super_admin(p_user_id) THEN
    RETURN QUERY
    SELECT a.id
    FROM public.associations a;
  ELSE
    -- Return only user's direct associations
    RETURN QUERY
    SELECT uam.association_id
    FROM public.user_association_memberships uam
    WHERE uam.user_id = p_user_id 
      AND uam.is_active = true;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN;
END;
$$;

-- Function to check if users share associations (bypasses RLS)
CREATE OR REPLACE FUNCTION users_share_association(p_user1_id uuid, p_user2_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- If either user is super admin, return true
  IF is_user_super_admin(p_user1_id) OR is_user_super_admin(p_user2_id) THEN
    RETURN true;
  END IF;

  -- Check if users share any active association membership
  RETURN EXISTS (
    SELECT 1
    FROM public.user_association_memberships uam1
    JOIN public.user_association_memberships uam2 ON uam1.association_id = uam2.association_id
    WHERE uam1.user_id = p_user1_id
      AND uam2.user_id = p_user2_id
      AND uam1.is_active = true
      AND uam2.is_active = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to check if user can manage other users (bypasses RLS)
CREATE OR REPLACE FUNCTION can_user_manage_users(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Super admins can always manage users
  IF is_user_super_admin(p_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user has manage_users permission
  RETURN EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id
    AND r.permissions ? 'manage_users'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_user_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_associations_direct(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION users_share_association(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_manage_users(uuid) TO authenticated;

-- Step 2: Drop all existing problematic policies on user_role_assignments
DROP POLICY IF EXISTS "Users can read their own role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can read role assignments in shared associations or Super Admin can read all" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments or Super Admin can manage all" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can read association role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can create role assignments in association" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can update role assignments in association" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can delete role assignments in association" ON user_role_assignments;

-- Step 3: Create completely non-recursive policies for user_role_assignments

-- Policy 1: Users can always read their own role assignments (no recursion)
CREATE POLICY "Users can read own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can read role assignments of users they share associations with
-- This uses the new SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users can read shared association role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (users_share_association(auth.uid(), user_id));

-- Policy 3: Users can manage role assignments if they have permission
-- This uses the new SECURITY DEFINER function to avoid recursion
CREATE POLICY "Users with permission can manage role assignments"
  ON user_role_assignments
  FOR ALL
  TO authenticated
  USING (
    can_user_manage_users(auth.uid())
    AND users_share_association(auth.uid(), user_id)
  )
  WITH CHECK (
    can_user_manage_users(auth.uid())
    AND users_share_association(auth.uid(), user_id)
  );

-- Step 4: Update the user_has_permission function to use direct queries
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Super admins have all permissions
  IF is_user_super_admin(user_uuid) THEN
    RETURN true;
  END IF;

  -- Direct query without RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = user_uuid
    AND r.permissions ? permission_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION user_has_permission(uuid, text) TO authenticated;

-- Step 5: Update get_user_permissions function to use direct queries
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_permissions jsonb := '[]'::jsonb;
BEGIN
  -- Super admins get all permissions
  IF is_user_super_admin(user_uuid) THEN
    RETURN '["manage_users", "manage_roles", "manage_violations", "view_violations", "manage_company", "view_reports", "manage_settings", "create_violations"]'::jsonb;
  END IF;

  -- Direct query without RLS
  SELECT COALESCE(jsonb_agg(DISTINCT perm), '[]'::jsonb)
  INTO user_permissions
  FROM (
    SELECT jsonb_array_elements_text(r.permissions) as perm
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = user_uuid
  ) perms;
  
  RETURN user_permissions;
EXCEPTION
  WHEN OTHERS THEN
    RETURN '[]'::jsonb;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid) TO authenticated;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed infinite recursion in user_role_assignments policies';
  RAISE NOTICE 'Created new SECURITY DEFINER functions:';
  RAISE NOTICE '- is_user_super_admin(): Check super admin status without RLS';
  RAISE NOTICE '- get_user_associations_direct(): Get user associations without RLS';
  RAISE NOTICE '- users_share_association(): Check if users share associations without RLS';
  RAISE NOTICE '- can_user_manage_users(): Check manage_users permission without RLS';
  RAISE NOTICE 'Updated functions:';
  RAISE NOTICE '- user_has_permission(): Now uses direct queries without RLS';
  RAISE NOTICE '- get_user_permissions(): Now uses direct queries without RLS';
  RAISE NOTICE 'New policies eliminate ALL recursive references';
END $$;