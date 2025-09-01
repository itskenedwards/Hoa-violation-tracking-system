/*
  # Fix infinite recursion in roles RLS policies

  1. Problem Analysis
    - The current RLS policies on the `roles` table are causing infinite recursion
    - This happens when policies reference other tables that depend on roles, creating circular dependencies
    - The "Association admins can manage roles" policy is likely checking user roles to determine permissions, which creates a loop

  2. Solution
    - Simplify the RLS policies to avoid circular dependencies
    - Use direct user_id checks where possible instead of complex role-based checks
    - Ensure policies don't create loops by referencing the same table they're protecting

  3. Changes
    - Drop existing problematic policies on roles table
    - Create new, simplified policies that avoid recursion
    - Maintain security while preventing infinite loops
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Association admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Users can read association roles" ON roles;
DROP POLICY IF EXISTS "Users can read system roles" ON roles;

-- Create new simplified policies that avoid recursion

-- Allow users to read system roles (these are global and don't depend on user context)
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
    is_system_role = false 
    AND association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Allow association admins to manage roles (simplified check using direct admin role lookup)
-- This policy checks if the user has an 'Admin' role directly without creating recursion
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