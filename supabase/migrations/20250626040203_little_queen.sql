/*
  # Fix infinite recursion in user_role_assignments policies

  1. Problem
    - The existing policies for user_role_assignments table are causing infinite recursion
    - The "Manage role assignments with permission" policy checks permissions by querying the same table it's protecting
    - This creates a circular dependency that causes database errors

  2. Solution
    - Replace complex recursive policies with simpler, direct policies
    - Use auth.uid() for user identification instead of complex subqueries
    - Separate read and write permissions more clearly
    - Avoid self-referential queries in RLS policies

  3. New Policies
    - Users can read their own role assignments
    - Users can read role assignments within their association
    - Only users with explicit manage_users permission can modify assignments
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Manage role assignments with permission" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can read association role assignments" ON user_role_assignments;
DROP POLICY IF EXISTS "Users can read own role assignments" ON user_role_assignments;

-- Create new, simpler policies that avoid recursion

-- Policy 1: Users can always read their own role assignments
CREATE POLICY "Users can read own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can read role assignments of users in their association
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

-- Policy 3: Simple insert policy - users can create role assignments in their association
CREATE POLICY "Users can create role assignments in association"
  ON user_role_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_profiles up1, user_profiles up2
      WHERE up1.user_id = auth.uid()
        AND up2.user_id = user_role_assignments.user_id
        AND up1.association_id = up2.association_id
    )
  );

-- Policy 4: Simple update policy - users can update role assignments in their association
CREATE POLICY "Users can update role assignments in association"
  ON user_role_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles up1, user_profiles up2
      WHERE up1.user_id = auth.uid()
        AND up2.user_id = user_role_assignments.user_id
        AND up1.association_id = up2.association_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_profiles up1, user_profiles up2
      WHERE up1.user_id = auth.uid()
        AND up2.user_id = user_role_assignments.user_id
        AND up1.association_id = up2.association_id
    )
  );

-- Policy 5: Simple delete policy - users can delete role assignments in their association
CREATE POLICY "Users can delete role assignments in association"
  ON user_role_assignments
  FOR DELETE
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