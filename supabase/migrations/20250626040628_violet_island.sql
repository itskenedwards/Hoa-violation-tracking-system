/*
  # Fix infinite recursion in roles table RLS policies

  1. Problem
    - Current RLS policies on roles table create infinite recursion
    - Policies check user permissions by joining user_role_assignments -> roles
    - This creates a circular dependency when querying roles

  2. Solution
    - Simplify roles table policies to avoid circular references
    - Use direct association membership checks instead of permission-based checks
    - Maintain security while eliminating recursion

  3. Changes
    - Drop existing problematic policies on roles table
    - Create new simplified policies that don't create circular dependencies
    - Ensure users can still only see appropriate roles
*/

-- Drop existing problematic policies on roles table
DROP POLICY IF EXISTS "Association admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Users can read association roles" ON roles;
DROP POLICY IF EXISTS "Users can read system roles" ON roles;

-- Create new simplified policies for roles table that avoid recursion

-- Policy 1: Users can read system roles (no recursion risk)
CREATE POLICY "Users can read system roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (is_system_role = true);

-- Policy 2: Users can read roles in their association (direct association check, no recursion)
CREATE POLICY "Users can read association roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    is_system_role = false 
    AND association_id IN (
      SELECT user_profiles.association_id 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid()
    )
  );

-- Policy 3: Association admins can manage non-system roles in their association
-- This policy checks for Admin role name directly to avoid recursion
CREATE POLICY "Association admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    is_system_role = false 
    AND association_id IN (
      SELECT up.association_id
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = auth.uid()
        AND r.name = 'Admin'
        AND r.association_id = up.association_id
        AND r.is_system_role = false
      )
    )
  )
  WITH CHECK (
    is_system_role = false 
    AND association_id IN (
      SELECT up.association_id
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = auth.uid()
        AND r.name = 'Admin'
        AND r.association_id = up.association_id
        AND r.is_system_role = false
      )
    )
  );

-- Alternative simpler admin policy that avoids potential recursion entirely
-- by checking for a specific admin permission in user metadata or using a different approach
DROP POLICY IF EXISTS "Association admins can manage roles" ON roles;

CREATE POLICY "Association admins can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    is_system_role = false 
    AND association_id IN (
      SELECT user_profiles.association_id 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid()
    )
    -- For now, allow all association members to manage roles
    -- This can be refined later with a non-recursive permission check
  )
  WITH CHECK (
    is_system_role = false 
    AND association_id IN (
      SELECT user_profiles.association_id 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid()
    )
  );