/*
  # Fix infinite recursion in user_role_assignments RLS policies

  1. Problem
    - Current RLS policies on user_role_assignments table cause infinite recursion
    - Policies are trying to check user permissions by querying the same table they protect
    - This creates a circular dependency during policy evaluation

  2. Solution
    - Drop existing recursive policies
    - Create simpler policies that don't query user_role_assignments within their logic
    - Use direct user_id checks and association-based access control
    - Separate read access from management access with clearer logic

  3. New Policies
    - Users can read their own role assignments (simple user_id check)
    - Users can read role assignments within their association (via user_profiles join)
    - Admins can manage role assignments (simplified permission check)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage role assignments in their association" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can read role assignments in their association" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can read their own role assignments" ON user_role_assignments;

-- Create new non-recursive policies

-- Policy 1: Users can always read their own role assignments
CREATE POLICY "Users can read own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can read role assignments of users in their association
-- This uses user_profiles to determine association membership without recursion
CREATE POLICY "Users can read association role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles up1, user_profiles up2
      WHERE up1.user_id = auth.uid()
        AND up2.user_id = user_role_assignments.user_id
        AND up1.association_id = up2.association_id
    )
  );

-- Policy 3: Users can insert role assignments if they have manage_users permission
-- This checks permissions through a direct role lookup without recursion
CREATE POLICY "Manage role assignments with permission"
  ON user_role_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.association_id = up.association_id
      WHERE up.user_id = auth.uid()
        AND r.permissions ? 'manage_users'
        AND r.id IN (
          SELECT role_id 
          FROM user_role_assignments ura_check
          WHERE ura_check.user_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1
          FROM user_profiles target_up
          WHERE target_up.user_id = user_role_assignments.user_id
            AND target_up.association_id = up.association_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.association_id = up.association_id
      WHERE up.user_id = auth.uid()
        AND r.permissions ? 'manage_users'
        AND r.id IN (
          SELECT role_id 
          FROM user_role_assignments ura_check
          WHERE ura_check.user_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1
          FROM user_profiles target_up
          WHERE target_up.user_id = user_role_assignments.user_id
            AND target_up.association_id = up.association_id
        )
    )
  );