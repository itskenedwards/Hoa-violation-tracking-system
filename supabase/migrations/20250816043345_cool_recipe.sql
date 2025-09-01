/*
  # Fix RLS Infinite Recursion on user_role_assignments

  1. Problem
    - RLS policies on user_role_assignments table cause infinite recursion
    - Policies check permissions by querying the same table they protect
    - Creates circular dependency when loading user profiles

  2. Solution
    - Create SECURITY DEFINER functions that bypass RLS
    - Use these functions in policies to avoid recursion
    - Break the circular dependency in permission checks

  3. New Functions
    - is_super_admin(): Check super admin status without RLS
    - get_current_user_permissions(): Get user permissions without RLS
    - Updated user_has_permission(): Use new approach to avoid recursion
*/

-- Drop problematic policies on user_role_assignments
DROP POLICY IF EXISTS "Users can read role assignments in shared associations or Super Admin can read all" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments or Super Admin can manage all" ON user_role_assignments;

-- Create is_super_admin function that bypasses RLS
CREATE OR REPLACE FUNCTION is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id
    AND r.name = 'Super Admin'
    AND r.is_system_role = true
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_super_admin(uuid) TO authenticated;

-- Create get_current_user_permissions function that bypasses RLS
CREATE OR REPLACE FUNCTION get_current_user_permissions()
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.perm
  FROM public.user_role_assignments ura
  JOIN public.roles r ON ura.role_id = r.id
  CROSS JOIN LATERAL jsonb_array_elements_text(r.permissions) as p(perm)
  WHERE ura.user_id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_permissions() TO authenticated;

-- Update user_has_permission function to use the new approach
CREATE OR REPLACE FUNCTION user_has_permission(p_permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN p_permission_name = ANY (SELECT perm FROM get_current_user_permissions());
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_has_permission(text) TO authenticated;

-- Recreate the policies on user_role_assignments using the new functions
CREATE POLICY "Users can read role assignments in shared associations or Super Admin can read all"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT uam.user_id
      FROM user_association_memberships uam
      WHERE uam.association_id IN (
        SELECT uam2.association_id
        FROM user_association_memberships uam2
        WHERE uam2.user_id = auth.uid()
        AND uam2.is_active = true
      )
      AND uam.is_active = true
    )
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Admins can manage role assignments or Super Admin can manage all"
  ON user_role_assignments
  FOR ALL
  TO authenticated
  USING (
    (
      user_id IN (
        SELECT uam.user_id
        FROM user_association_memberships uam
        WHERE uam.association_id IN (
          SELECT uam2.association_id
          FROM user_association_memberships uam2
          WHERE uam2.user_id = auth.uid()
          AND uam2.is_active = true
        )
        AND uam.is_active = true
      )
      AND user_has_permission('manage_users')
    )
    OR is_super_admin(auth.uid())
  )
  WITH CHECK (
    (
      user_id IN (
        SELECT uam.user_id
        FROM user_association_memberships uam
        WHERE uam.association_id IN (
          SELECT uam2.association_id
          FROM user_association_memberships uam2
          WHERE uam2.user_id = auth.uid()
          AND uam2.is_active = true
        )
        AND uam.is_active = true
      )
      AND user_has_permission('manage_users')
    )
    OR is_super_admin(auth.uid())
  );

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS recursion fix for user_role_assignments applied successfully';
  RAISE NOTICE 'New functions created:';
  RAISE NOTICE '- is_super_admin(): Check super admin status without RLS';
  RAISE NOTICE '- get_current_user_permissions(): Get user permissions without RLS';
  RAISE NOTICE '- user_has_permission(): Updated to use new approach';
  RAISE NOTICE 'RLS policies on user_role_assignments updated to prevent recursion';
END $$;