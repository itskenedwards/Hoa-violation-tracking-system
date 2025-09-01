/*
  # Fix infinite recursion in roles table RLS policies

  1. Problem
    - The current RLS policies on the `roles` table are causing infinite recursion
    - This happens when a policy references itself or creates a circular dependency
    - The error occurs when trying to load user roles and assignments

  2. Solution
    - Drop the existing problematic policies
    - Create new, simpler policies that avoid recursion
    - Ensure users can read roles without circular references
    - Allow proper role management for admins

  3. Changes
    - Remove existing policies that cause recursion
    - Add new policies with direct user checks
    - Simplify permission checks to avoid circular dependencies
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage roles in their association" ON roles;
DROP POLICY IF EXISTS "Users can read roles in their association" ON roles;

-- Create new policies that avoid recursion
-- Allow users to read system roles (these don't belong to any association)
CREATE POLICY "Users can read system roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (is_system_role = true);

-- Allow users to read roles in their association using a direct join
CREATE POLICY "Users can read association roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT up.association_id
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- Allow users with manage_roles permission to manage roles in their association
-- This uses a more direct approach to avoid recursion
CREATE POLICY "Manage roles in association"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    is_system_role = false
    AND association_id IN (
      SELECT up.association_id
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND r.permissions ? 'manage_roles'
    )
  )
  WITH CHECK (
    is_system_role = false
    AND association_id IN (
      SELECT up.association_id
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND r.permissions ? 'manage_roles'
    )
  );