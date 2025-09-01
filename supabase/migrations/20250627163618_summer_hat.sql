/*
  # Fix association_unitinfo RLS policies

  1. Problem
    - association_unitinfo table may not have proper RLS policies
    - This could allow users to see addresses from other associations
    - Users should only see addresses from their own association

  2. Solution
    - Add proper RLS policies for association_unitinfo table
    - Ensure users can only access units from their association
    - Add policies for create, read, update, delete operations

  3. Security
    - Users can only see units from their own association
    - Only users with proper permissions can modify unit information
*/

-- First, ensure RLS is enabled on association_unitinfo
ALTER TABLE association_unitinfo ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read addresses in their association" ON association_unitinfo;
DROP POLICY IF EXISTS "Users can create addresses in their association" ON association_unitinfo;
DROP POLICY IF EXISTS "Users can update addresses in their association" ON association_unitinfo;
DROP POLICY IF EXISTS "Users can delete addresses in their association" ON association_unitinfo;

-- Create proper RLS policies for association_unitinfo

-- Allow users to read units from their association
CREATE POLICY "Users can read units in their association"
  ON association_unitinfo
  FOR SELECT
  TO authenticated
  USING (
    association_streetname_id IN (
      SELECT asn.id
      FROM association_streetnames asn
      JOIN user_profiles up ON asn.association_id = up.association_id
      WHERE up.user_id = auth.uid()
    )
  );

-- Allow users with proper permissions to create units
CREATE POLICY "Users can create units in their association"
  ON association_unitinfo
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_streetname_id IN (
      SELECT asn.id
      FROM association_streetnames asn
      JOIN user_profiles up ON asn.association_id = up.association_id
      WHERE up.user_id = auth.uid()
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

-- Allow users with proper permissions to update units
CREATE POLICY "Users can update units in their association"
  ON association_unitinfo
  FOR UPDATE
  TO authenticated
  USING (
    association_streetname_id IN (
      SELECT asn.id
      FROM association_streetnames asn
      JOIN user_profiles up ON asn.association_id = up.association_id
      WHERE up.user_id = auth.uid()
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
    association_streetname_id IN (
      SELECT asn.id
      FROM association_streetnames asn
      JOIN user_profiles up ON asn.association_id = up.association_id
      WHERE up.user_id = auth.uid()
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

-- Allow users with proper permissions to delete units
CREATE POLICY "Users can delete units in their association"
  ON association_unitinfo
  FOR DELETE
  TO authenticated
  USING (
    association_streetname_id IN (
      SELECT asn.id
      FROM association_streetnames asn
      JOIN user_profiles up ON asn.association_id = up.association_id
      WHERE up.user_id = auth.uid()
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

-- Also ensure the view has proper RLS
-- Grant access to the view for authenticated users
GRANT SELECT ON association_unitinfo_with_types TO authenticated;

-- Log the completion
DO $$
DECLARE
  unit_count integer;
BEGIN
  SELECT COUNT(*) INTO unit_count FROM association_unitinfo;
  RAISE NOTICE 'RLS policies added for association_unitinfo table';
  RAISE NOTICE 'Total units in database: %', unit_count;
  RAISE NOTICE 'Address filtering should now work correctly';
END $$;