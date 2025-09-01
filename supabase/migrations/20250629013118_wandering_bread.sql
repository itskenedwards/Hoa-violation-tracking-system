/*
  # Grant super admins access to manage address data across associations

  1. Policy Updates
    - Update RLS policies on association_streetnames table to allow super admins
    - Update RLS policies on association_unitinfo table to allow super admins
    - Super admins can manage address data across all associations
    - Regular users maintain existing association-scoped access

  2. Super Admin Definition
    - Users with 'Super Admin' system role or 'manage_company' permission
    - Can manage address data across all associations, not just their own

  3. Security
    - Maintain existing security for regular users
    - Add special access for super admins only
    - Ensure proper permission checks
*/

-- Update association_streetnames policies to allow super admin access
DROP POLICY IF EXISTS "Users can create street names in their association" ON association_streetnames;
DROP POLICY IF EXISTS "Users can update street names in their association" ON association_streetnames;
DROP POLICY IF EXISTS "Users can delete street names in their association" ON association_streetnames;

-- Create new policies that include super admin access
CREATE POLICY "Users can create street names in their association"
  ON association_streetnames
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Regular users can create in their association
    (
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
    OR
    -- Super admins can create in any association
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

CREATE POLICY "Users can update street names in their association"
  ON association_streetnames
  FOR UPDATE
  TO authenticated
  USING (
    -- Regular users can update in their association
    (
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
    OR
    -- Super admins can update any association's street names
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (
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
    OR
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

CREATE POLICY "Users can delete street names in their association"
  ON association_streetnames
  FOR DELETE
  TO authenticated
  USING (
    -- Regular users can delete in their association (manage_company only)
    (
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
    )
    OR
    -- Super admins can delete any association's street names
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

-- Update association_unitinfo policies to allow super admin access
DROP POLICY IF EXISTS "Users can create units in their association" ON association_unitinfo;
DROP POLICY IF EXISTS "Users can update units in their association" ON association_unitinfo;
DROP POLICY IF EXISTS "Users can delete units in their association" ON association_unitinfo;

-- Create new policies that include super admin access
CREATE POLICY "Users can create units in their association"
  ON association_unitinfo
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Regular users can create in their association
    (
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
    OR
    -- Super admins can create in any association
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

CREATE POLICY "Users can update units in their association"
  ON association_unitinfo
  FOR UPDATE
  TO authenticated
  USING (
    -- Regular users can update in their association
    (
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
    OR
    -- Super admins can update any association's units
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    (
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
    OR
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

CREATE POLICY "Users can delete units in their association"
  ON association_unitinfo
  FOR DELETE
  TO authenticated
  USING (
    -- Regular users can delete in their association (manage_company only)
    (
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
    )
    OR
    -- Super admins can delete any association's units
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

-- Also update the read policies to allow super admins to see all associations' data
DROP POLICY IF EXISTS "Users can read street names in their association" ON association_streetnames;
DROP POLICY IF EXISTS "Users can read units in their association" ON association_unitinfo;

CREATE POLICY "Users can read street names in their association"
  ON association_streetnames
  FOR SELECT
  TO authenticated
  USING (
    -- Regular users can read from their association
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR
    -- Super admins can read from all associations
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

CREATE POLICY "Users can read units in their association"
  ON association_unitinfo
  FOR SELECT
  TO authenticated
  USING (
    -- Regular users can read from their association
    association_streetname_id IN (
      SELECT asn.id
      FROM association_streetnames asn
      JOIN user_profiles up ON asn.association_id = up.association_id
      WHERE up.user_id = auth.uid()
    )
    OR
    -- Super admins can read from all associations
    EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid()
      AND (
        (r.name = 'Super Admin' AND r.is_system_role = true)
        OR r.permissions ? 'manage_company'
      )
    )
  );

-- Log the completion
DO $$
BEGIN
  RAISE NOTICE 'Super admin address access policies updated successfully';
  RAISE NOTICE 'Super admins can now manage address data across all associations';
  RAISE NOTICE 'Regular users maintain association-scoped access';
END $$;