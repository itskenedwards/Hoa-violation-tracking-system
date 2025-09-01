/*
  # Create property types lookup table

  1. New Tables
    - `property_types`
      - `id` (uuid, primary key)
      - `association_id` (uuid, foreign key to associations, nullable for system types)
      - `name` (text, property type name)
      - `description` (text, optional description)
      - `is_system_type` (boolean, whether it's a default system type)
      - `is_active` (boolean, whether the type is currently active)
      - `sort_order` (integer, for ordering types in UI)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on property_types table
    - Add policies for association-scoped access
    - System types are visible to all associations

  3. Default Property Types
    - Insert default system property types that all associations can use
    - Each association can also create custom property types

  4. Update association_unitinfo table
    - Add property_type_id column to reference the new lookup table
    - Migrate existing property_type data
    - Add foreign key constraint
*/

-- Create property_types table
CREATE TABLE IF NOT EXISTS property_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system_type boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, association_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_types_association_id ON property_types(association_id);
CREATE INDEX IF NOT EXISTS idx_property_types_name ON property_types(name);
CREATE INDEX IF NOT EXISTS idx_property_types_active ON property_types(is_active);
CREATE INDEX IF NOT EXISTS idx_property_types_sort_order ON property_types(sort_order);

-- Enable Row Level Security
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;

-- Create policies for property_types
CREATE POLICY "Users can read property types in their association"
  ON property_types
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR is_system_type = true
  );

CREATE POLICY "Admins can manage property types in their association"
  ON property_types
  FOR ALL
  TO authenticated
  USING (
    association_id IN (
      SELECT up.association_id 
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
    AND is_system_type = false
  )
  WITH CHECK (
    association_id IN (
      SELECT up.association_id 
      FROM user_profiles up
      WHERE up.user_id = auth.uid()
    )
    AND is_system_type = false
  );

-- Insert default system property types
INSERT INTO property_types (name, description, is_system_type, sort_order) VALUES
  ('Single Family', 'Detached single-family home', true, 1),
  ('Townhouse', 'Multi-level attached home', true, 2),
  ('Condominium', 'Individual unit in a multi-unit building', true, 3),
  ('Duplex', 'Two-unit residential building', true, 4),
  ('Apartment', 'Rental unit in a multi-unit building', true, 5),
  ('Mobile Home', 'Manufactured home in a community', true, 6),
  ('Villa', 'Luxury single-family home', true, 7),
  ('Patio Home', 'Single-family home with shared walls', true, 8),
  ('Cooperative', 'Resident-owned housing cooperative unit', true, 9),
  ('Other', 'Other property type not listed', true, 10);

-- Create trigger to update updated_at timestamp for property types
CREATE TRIGGER update_property_types_updated_at
  BEFORE UPDATE ON property_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Now update the association_unitinfo table to use the lookup table
-- First, add the new property_type_id column
ALTER TABLE association_unitinfo ADD COLUMN property_type_id uuid REFERENCES property_types(id) ON DELETE SET NULL;

-- Create an index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_association_unitinfo_property_type_id ON association_unitinfo(property_type_id);

-- Migrate existing property_type data to use the lookup table
DO $$
DECLARE
  unit_record RECORD;
  property_type_id_val uuid;
BEGIN
  -- Loop through all existing units and map their property_type text to property type IDs
  FOR unit_record IN 
    SELECT id, property_type FROM association_unitinfo WHERE property_type_id IS NULL
  LOOP
    -- Find the matching system property type
    SELECT id INTO property_type_id_val
    FROM property_types 
    WHERE name = unit_record.property_type 
    AND is_system_type = true
    LIMIT 1;
    
    -- If no exact match found, use 'Single Family' as default
    IF property_type_id_val IS NULL THEN
      SELECT id INTO property_type_id_val
      FROM property_types 
      WHERE name = 'Single Family' 
      AND is_system_type = true
      LIMIT 1;
    END IF;
    
    -- Update the unit with the property type ID
    IF property_type_id_val IS NOT NULL THEN
      UPDATE association_unitinfo 
      SET property_type_id = property_type_id_val 
      WHERE id = unit_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migrated existing property types to lookup table';
END $$;

-- Make property_type_id required after migration
ALTER TABLE association_unitinfo ALTER COLUMN property_type_id SET NOT NULL;

-- Drop the old property_type column
ALTER TABLE association_unitinfo DROP COLUMN IF EXISTS property_type;

-- Create a view for easier querying of units with property type details
CREATE OR REPLACE VIEW association_unitinfo_with_types AS
SELECT 
  au.*,
  pt.name as property_type_name,
  pt.description as property_type_description
FROM association_unitinfo au
JOIN property_types pt ON au.property_type_id = pt.id;

-- Grant access to the view
GRANT SELECT ON association_unitinfo_with_types TO authenticated;

-- Log the completion
DO $$
DECLARE
  property_type_count integer;
BEGIN
  SELECT COUNT(*) INTO property_type_count FROM property_types;
  RAISE NOTICE 'Property types lookup table created successfully';
  RAISE NOTICE 'Total property types in database: %', property_type_count;
  RAISE NOTICE 'association_unitinfo table updated to use lookup table';
END $$;