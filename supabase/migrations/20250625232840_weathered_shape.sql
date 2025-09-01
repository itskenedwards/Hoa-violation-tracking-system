/*
  # Create violation categories lookup table

  1. New Tables
    - `violation_categories`
      - `id` (uuid, primary key)
      - `association_id` (uuid, foreign key to associations, nullable for system categories)
      - `name` (text, category name)
      - `description` (text, optional description)
      - `color` (text, hex color code for UI display)
      - `is_system_category` (boolean, whether it's a default system category)
      - `is_active` (boolean, whether the category is currently active)
      - `sort_order` (integer, for ordering categories in UI)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on violation_categories table
    - Add policies for association-scoped access
    - System categories are visible to all associations

  3. Default Categories
    - Insert default system categories that all associations can use
    - Each association can also create custom categories

  4. Update violations table
    - Change category column to reference the new lookup table
    - Add foreign key constraint
*/

-- Create violation_categories table
CREATE TABLE IF NOT EXISTS violation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid REFERENCES associations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6B7280', -- Default gray color
  is_system_category boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, association_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_violation_categories_association_id ON violation_categories(association_id);
CREATE INDEX IF NOT EXISTS idx_violation_categories_name ON violation_categories(name);
CREATE INDEX IF NOT EXISTS idx_violation_categories_active ON violation_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_violation_categories_sort_order ON violation_categories(sort_order);

-- Enable Row Level Security
ALTER TABLE violation_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for violation_categories
CREATE POLICY "Users can read categories in their association"
  ON violation_categories
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR is_system_category = true
  );

CREATE POLICY "Admins can manage categories in their association"
  ON violation_categories
  FOR ALL
  TO authenticated
  USING (
    association_id IN (
      SELECT up.association_id 
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND (r.permissions ? 'manage_violations' OR r.permissions ? 'manage_company')
    )
    AND is_system_category = false
  )
  WITH CHECK (
    association_id IN (
      SELECT up.association_id 
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND (r.permissions ? 'manage_violations' OR r.permissions ? 'manage_company')
    )
    AND is_system_category = false
  );

-- Insert default system categories
INSERT INTO violation_categories (name, description, color, is_system_category, sort_order) VALUES
  ('Landscaping', 'Issues related to lawn care, gardens, and outdoor maintenance', '#10B981', true, 1),
  ('Parking', 'Parking violations and vehicle-related issues', '#3B82F6', true, 2),
  ('Noise', 'Noise complaints and disturbances', '#8B5CF6', true, 3),
  ('Architectural', 'Building modifications and structural issues', '#F59E0B', true, 4),
  ('Pet', 'Pet-related violations and complaints', '#EC4899', true, 5),
  ('Trash/Recycling', 'Waste management and recycling issues', '#6B7280', true, 6),
  ('Pool/Spa', 'Pool and spa area violations', '#06B6D4', true, 7),
  ('Other', 'Miscellaneous violations not covered by other categories', '#64748B', true, 8);

-- Create trigger to update updated_at timestamp for categories
CREATE TRIGGER update_violation_categories_updated_at
  BEFORE UPDATE ON violation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Now update the violations table to use the lookup table
-- First, add the new category_id column
ALTER TABLE violations ADD COLUMN category_id uuid REFERENCES violation_categories(id) ON DELETE SET NULL;

-- Create an index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_violations_category_id ON violations(category_id);

-- Migrate existing category data to use the lookup table
DO $$
DECLARE
  violation_record RECORD;
  category_id_val uuid;
BEGIN
  -- Loop through all existing violations and map their category text to category IDs
  FOR violation_record IN 
    SELECT id, category FROM violations WHERE category_id IS NULL
  LOOP
    -- Find the matching system category
    SELECT id INTO category_id_val
    FROM violation_categories 
    WHERE name = violation_record.category 
    AND is_system_category = true
    LIMIT 1;
    
    -- Update the violation with the category ID
    IF category_id_val IS NOT NULL THEN
      UPDATE violations 
      SET category_id = category_id_val 
      WHERE id = violation_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migrated existing violation categories to lookup table';
END $$;

-- Make category_id required after migration
ALTER TABLE violations ALTER COLUMN category_id SET NOT NULL;

-- Drop the old category column and its check constraint
ALTER TABLE violations DROP CONSTRAINT IF EXISTS violations_category_check;
ALTER TABLE violations DROP COLUMN IF EXISTS category;

-- Update the violations table policies to work with the new structure
-- (The existing policies should still work since they reference association_id)

-- Create a view for easier querying of violations with category details
CREATE OR REPLACE VIEW violations_with_categories AS
SELECT 
  v.*,
  vc.name as category_name,
  vc.description as category_description,
  vc.color as category_color
FROM violations v
JOIN violation_categories vc ON v.category_id = vc.id;

-- Grant access to the view
GRANT SELECT ON violations_with_categories TO authenticated;

-- Create RLS policy for the view
ALTER VIEW violations_with_categories SET (security_barrier = true);