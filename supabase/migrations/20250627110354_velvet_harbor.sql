/*
  # Fix association_streetnames RLS policies

  1. Problem
    - association_streetnames table has RLS enabled but no policies
    - This blocks all access to street names data
    - Users cannot see street names in the violation form

  2. Solution
    - Add proper RLS policies for association_streetnames table
    - Allow users to read street names from their association
    - Allow users with proper permissions to manage street names

  3. Security
    - Users can only see street names from their own association
    - Only users with manage_company or manage_violations permissions can modify street names
*/

-- Add RLS policies for association_streetnames table

-- Allow users to read street names from their association
CREATE POLICY "Users can read street names in their association"
  ON association_streetnames
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users with proper permissions to create street names
CREATE POLICY "Users can create street names in their association"
  ON association_streetnames
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND (r.permissions ? 'manage_company' OR r.permissions ? 'manage_violations')
    )
  );

-- Allow users with proper permissions to update street names
CREATE POLICY "Users can update street names in their association"
  ON association_streetnames
  FOR UPDATE
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND (r.permissions ? 'manage_company' OR r.permissions ? 'manage_violations')
    )
  )
  WITH CHECK (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND (r.permissions ? 'manage_company' OR r.permissions ? 'manage_violations')
    )
  );

-- Allow users with proper permissions to delete street names
CREATE POLICY "Users can delete street names in their association"
  ON association_streetnames
  FOR DELETE
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_company'
    )
  );

-- Log the completion
DO $$
DECLARE
  street_count integer;
BEGIN
  SELECT COUNT(*) INTO street_count FROM association_streetnames;
  RAISE NOTICE 'RLS policies added for association_streetnames table';
  RAISE NOTICE 'Total street names in database: %', street_count;
END $$;