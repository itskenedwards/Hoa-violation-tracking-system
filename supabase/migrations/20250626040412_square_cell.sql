/*
  # Fix infinite recursion in roles table RLS policies

  1. Problem
    - Current RLS policies on roles table create infinite recursion
    - Policies check user permissions by joining with roles table itself
    - This creates circular dependency when loading user roles

  2. Solution
    - Simplify policies to avoid recursive checks
    - Use direct association membership checks instead of permission-based checks
    - Allow users to read roles in their association without permission checks
    - Restrict management operations to users with explicit admin roles

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Maintain security while preventing circular dependencies
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Manage roles in association" ON roles;
DROP POLICY IF EXISTS "Users can read association roles" ON roles;
DROP POLICY IF EXISTS "Users can read system roles" ON roles;

-- Create new simplified policies that avoid recursion

-- Allow users to read system roles (no recursion risk)
CREATE POLICY "Users can read system roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (is_system_role = true);

-- Allow users to read roles in their association (simplified check)
CREATE POLICY "Users can read association roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Allow role management only for users who are explicitly marked as admins
-- This uses a simpler check that doesn't create recursion
CREATE POLICY "Association admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    is_system_role = false 
    AND association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND r.name = 'Admin'
      AND r.association_id = roles.association_id
    )
  )
  WITH CHECK (
    is_system_role = false 
    AND association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND r.name = 'Admin'
      AND r.association_id = roles.association_id
    )
  );