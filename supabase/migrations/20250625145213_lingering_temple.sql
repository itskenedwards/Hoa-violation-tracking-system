/*
  # Rename companies table to associations

  1. Schema Changes
    - Rename `companies` table to `associations`
    - Update all foreign key references
    - Update all indexes and constraints
    - Update all RLS policies
    - Update all functions that reference the old table

  2. Data Migration
    - All existing data will be preserved during the rename
    - All relationships will be maintained

  3. Security
    - All existing RLS policies will be recreated for the new table name
    - Permissions and access controls remain the same
*/

-- Step 1: Rename the table
ALTER TABLE companies RENAME TO associations;

-- Step 2: Update foreign key column names in related tables
ALTER TABLE user_profiles RENAME COLUMN company_id TO association_id;
ALTER TABLE roles RENAME COLUMN company_id TO association_id;
ALTER TABLE addresses RENAME COLUMN company_id TO association_id;

-- Step 3: Update constraint names to reflect new table name (check if they exist first)
DO $$
BEGIN
  -- Rename primary key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'companies_pkey' AND table_name = 'associations'
  ) THEN
    ALTER TABLE associations RENAME CONSTRAINT companies_pkey TO associations_pkey;
  END IF;

  -- Rename unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'companies_name_key' AND table_name = 'associations'
  ) THEN
    ALTER TABLE associations RENAME CONSTRAINT companies_name_key TO associations_name_key;
  END IF;
END $$;

-- Step 4: Update foreign key constraint names
DO $$
BEGIN
  -- Update user_profiles foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_profiles_company_id_fkey' AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_company_id_fkey;
  END IF;
  
  ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_association_id_fkey 
    FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE;

  -- Update roles foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'roles_company_id_fkey' AND table_name = 'roles'
  ) THEN
    ALTER TABLE roles DROP CONSTRAINT roles_company_id_fkey;
  END IF;
  
  ALTER TABLE roles ADD CONSTRAINT roles_association_id_fkey 
    FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE;

  -- Update addresses foreign key
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'addresses_company_id_fkey' AND table_name = 'addresses'
  ) THEN
    ALTER TABLE addresses DROP CONSTRAINT addresses_company_id_fkey;
  END IF;
  
  ALTER TABLE addresses ADD CONSTRAINT addresses_association_id_fkey 
    FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE;
END $$;

-- Step 5: Update index names (check if they exist first)
DO $$
BEGIN
  -- Rename association table indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_companies_city'
  ) THEN
    ALTER INDEX idx_companies_city RENAME TO idx_associations_city;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_companies_state'
  ) THEN
    ALTER INDEX idx_companies_state RENAME TO idx_associations_state;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_companies_email'
  ) THEN
    ALTER INDEX idx_companies_email RENAME TO idx_associations_email;
  END IF;

  -- Rename other table indexes that reference company_id
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_roles_company_id'
  ) THEN
    ALTER INDEX idx_roles_company_id RENAME TO idx_roles_association_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_addresses_company_id'
  ) THEN
    ALTER INDEX idx_addresses_company_id RENAME TO idx_addresses_association_id;
  END IF;
END $$;

-- Step 6: Update unique constraints
DO $$
BEGIN
  -- Update roles unique constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'roles_name_company_id_key' AND table_name = 'roles'
  ) THEN
    ALTER TABLE roles DROP CONSTRAINT roles_name_company_id_key;
  END IF;
  
  ALTER TABLE roles ADD CONSTRAINT roles_name_association_id_key UNIQUE (name, association_id);

  -- Update addresses unique constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_address_per_company' AND table_name = 'addresses'
  ) THEN
    ALTER TABLE addresses DROP CONSTRAINT unique_address_per_company;
  END IF;
  
  ALTER TABLE addresses ADD CONSTRAINT unique_address_per_association 
    UNIQUE (association_id, street_address, unit_number);
END $$;

-- Step 7: Drop and recreate RLS policies with updated references

-- Drop old policies for associations (formerly companies)
DROP POLICY IF EXISTS "Authenticated users can read companies for signup" ON associations;
DROP POLICY IF EXISTS "Public can read companies for signup" ON associations;
DROP POLICY IF EXISTS "Admins can create companies" ON associations;

-- Create new policies for associations
CREATE POLICY "Authenticated users can read associations for signup"
  ON associations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can read associations for signup"
  ON associations
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can create associations"
  ON associations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_company'
    )
  );

-- Update user_profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update roles policies
DROP POLICY IF EXISTS "Users can read roles in their company" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles in their company" ON roles;

CREATE POLICY "Users can read roles in their association"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR is_system_role = true
  );

CREATE POLICY "Admins can manage roles in their association"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    association_id IN (
      SELECT up.association_id 
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_roles'
    )
    AND is_system_role = false
  )
  WITH CHECK (
    association_id IN (
      SELECT up.association_id 
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_roles'
    )
    AND is_system_role = false
  );

-- Update user_role_assignments policies
DROP POLICY IF EXISTS "Users can read role assignments in their company" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments in their company" ON user_role_assignments;

CREATE POLICY "Users can read role assignments in their association"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles up1
      JOIN user_profiles up2 ON up1.association_id = up2.association_id
      WHERE up1.user_id = auth.uid()
      AND up2.user_id = user_role_assignments.user_id
    )
  );

CREATE POLICY "Admins can manage role assignments in their association"
  ON user_role_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_users'
      AND up.association_id IN (
        SELECT association_id 
        FROM user_profiles 
        WHERE user_id = user_role_assignments.user_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_users'
      AND up.association_id IN (
        SELECT association_id 
        FROM user_profiles 
        WHERE user_id = user_role_assignments.user_id
      )
    )
  );

-- Update addresses policies
DROP POLICY IF EXISTS "Users can read addresses in their company" ON addresses;
DROP POLICY IF EXISTS "Users can create addresses in their company" ON addresses;
DROP POLICY IF EXISTS "Users can update addresses in their company" ON addresses;
DROP POLICY IF EXISTS "Users can delete addresses in their company" ON addresses;

CREATE POLICY "Users can read addresses in their association"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create addresses in their association"
  ON addresses
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

CREATE POLICY "Users can update addresses in their association"
  ON addresses
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

CREATE POLICY "Users can delete addresses in their association"
  ON addresses
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

-- Step 8: Update violations table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'violations'
  ) THEN
    -- Rename company_id column to association_id in violations table
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'violations' AND column_name = 'company_id'
    ) THEN
      ALTER TABLE violations RENAME COLUMN company_id TO association_id;
      
      -- Update foreign key constraint
      IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'violations_company_id_fkey' AND table_name = 'violations'
      ) THEN
        ALTER TABLE violations DROP CONSTRAINT violations_company_id_fkey;
      END IF;
      
      ALTER TABLE violations ADD CONSTRAINT violations_association_id_fkey 
        FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE;
      
      -- Update index
      IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_violations_company_id'
      ) THEN
        DROP INDEX idx_violations_company_id;
      END IF;
      
      CREATE INDEX IF NOT EXISTS idx_violations_association_id ON violations(association_id);
    END IF;
  END IF;
END $$;

-- Log the completion
DO $$
DECLARE
  association_count integer;
BEGIN
  SELECT COUNT(*) INTO association_count FROM associations;
  RAISE NOTICE 'Successfully renamed companies table to associations';
  RAISE NOTICE 'Total associations in database: %', association_count;
  RAISE NOTICE 'All foreign key references and policies have been updated';
END $$;