/*
  # Fix RLS Infinite Recursion on roles table

  1. Problem
    - RLS policies on roles table cause infinite recursion
    - Policies check permissions by querying the same table they protect, or use functions that do so recursively.

  2. Solution
    - Recreate RLS policies for the `roles` table to use SECURITY DEFINER functions
    - These functions bypass RLS, breaking the circular dependency.

  3. Dependencies
    - This migration assumes the existence of the following SECURITY DEFINER functions from previous migrations:
      - `is_user_super_admin(uuid)`
      - `get_user_associations_direct(uuid)`
      - `user_has_permission(uuid, text)`
*/

-- Drop existing problematic policies on roles table
DROP POLICY IF EXISTS "Users can read association roles or Super Admin can read all" ON roles;
DROP POLICY IF EXISTS "Association admins can manage roles or Super Admin can manage all" ON roles;
DROP POLICY IF EXISTS "Users can read roles in their associations or Super Admin can read all" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles in their associations or Super Admin can manage all" ON roles;

-- Policy for SELECT: Users can read system roles, or roles in their direct associations, or if they are a Super Admin
CREATE POLICY "Users can read roles in their associations or Super Admin can read all"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    is_system_role = true
    OR association_id IN (SELECT association_id FROM get_user_associations_direct(auth.uid()))
    OR is_user_super_admin(auth.uid())
  );

-- Policy for ALL (INSERT, UPDATE, DELETE): Association admins can manage non-system roles in their associations, or if they are a Super Admin
CREATE POLICY "Admins can manage roles in their associations or Super Admin can manage all"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    (
      is_system_role = false
      AND association_id IN (SELECT association_id FROM get_user_associations_direct(auth.uid()))
      AND user_has_permission(auth.uid(), 'manage_roles')
    )
    OR is_user_super_admin(auth.uid())
  )
  WITH CHECK (
    (
      is_system_role = false
      AND association_id IN (SELECT association_id FROM get_user_associations_direct(auth.uid()))
      AND user_has_permission(auth.uid(), 'manage_roles')
    )
    OR is_user_super_admin(auth.uid())
  );

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS recursion fix for roles table applied successfully';
  RAISE NOTICE 'Policies on roles table updated to prevent recursion by using SECURITY DEFINER functions.';
END $$;