/*
  # Create addresses table for HOA properties

  1. New Tables
    - `addresses`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `street_address` (text, the full street address)
      - `unit_number` (text, optional unit/apartment number)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `property_type` (text, e.g., 'Single Family', 'Townhouse', 'Condo')
      - `is_active` (boolean, whether the address is currently part of the association)
      - `notes` (text, optional notes about the property)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `addresses` table
    - Add policies for company-based access control

  3. Indexes
    - Add indexes for better query performance on company_id and street_address
*/

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  street_address text NOT NULL,
  unit_number text,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  property_type text DEFAULT 'Single Family',
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate addresses within the same company
ALTER TABLE addresses ADD CONSTRAINT unique_address_per_company 
  UNIQUE (company_id, street_address, unit_number);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_addresses_company_id ON addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_addresses_street_address ON addresses(street_address);
CREATE INDEX IF NOT EXISTS idx_addresses_active ON addresses(is_active);

-- Enable Row Level Security
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create policies for addresses
CREATE POLICY "Users can read addresses in their company"
  ON addresses
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create addresses in their company"
  ON addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id 
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

CREATE POLICY "Users can update addresses in their company"
  ON addresses
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
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
    company_id IN (
      SELECT company_id 
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

CREATE POLICY "Users can delete addresses in their company"
  ON addresses
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
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

-- Add foreign key constraint to violations table to reference addresses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'violations'
  ) THEN
    -- Add address_id column to violations table if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'violations' AND column_name = 'address_id'
    ) THEN
      ALTER TABLE violations ADD COLUMN address_id uuid REFERENCES addresses(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_violations_address_id ON violations(address_id);
    END IF;
  END IF;
END $$;