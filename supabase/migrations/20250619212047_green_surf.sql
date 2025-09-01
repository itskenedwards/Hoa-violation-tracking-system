/*
  # Create roles and permissions system

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `description` (text, optional)
      - `permissions` (jsonb array)
      - `is_system_role` (boolean, default false)
      - `company_id` (uuid, foreign key to companies)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `user_role_assignments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `role_id` (uuid, foreign key to roles)
      - `assigned_by` (uuid, foreign key to auth.users)
      - `assigned_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for company-scoped access
    - Add permission-based access control

  3. Functions
    - `get_user_permissions()` - Get all permissions for a user
    - `user_has_permission()` - Check if user has specific permission
    - `assign_default_role_to_user()` - Auto-assign default role to new users

  4. Default Roles
    - Super Admin, Company Admin, Manager, User, Viewer
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  is_system_role boolean DEFAULT false,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name, company_id)
);

-- Create user role assignments table
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_company_id ON roles(company_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);

-- Remove the old role column from user_profiles if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN role;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Roles policies
CREATE POLICY "Users can read roles in their company"
  ON roles
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    OR is_system_role = true
  );

CREATE POLICY "Admins can manage roles in their company"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT up.company_id 
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_roles'
    )
    AND is_system_role = false
  )
  WITH CHECK (
    company_id IN (
      SELECT up.company_id 
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_roles'
    )
    AND is_system_role = false
  );

-- User role assignments policies
CREATE POLICY "Users can read their own role assignments"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read role assignments in their company"
  ON user_role_assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles up1
      JOIN user_profiles up2 ON up1.company_id = up2.company_id
      WHERE up1.user_id = auth.uid()
      AND up2.user_id = user_role_assignments.user_id
    )
  );

CREATE POLICY "Admins can manage role assignments in their company"
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
      AND up.company_id IN (
        SELECT company_id 
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
      AND up.company_id IN (
        SELECT company_id 
        FROM user_profiles 
        WHERE user_id = user_role_assignments.user_id
      )
    )
  );

-- Insert default system roles
INSERT INTO roles (name, description, permissions, is_system_role, company_id) VALUES
  ('Super Admin', 'Full system access with all permissions', 
   '["manage_users", "manage_roles", "manage_violations", "view_violations", "manage_company", "view_reports", "manage_settings"]'::jsonb, 
   true, null),
  ('Company Admin', 'Full company access with user and violation management', 
   '["manage_users", "manage_violations", "view_violations", "manage_company", "view_reports"]'::jsonb, 
   true, null),
  ('Manager', 'Can manage violations and view reports', 
   '["manage_violations", "view_violations", "view_reports"]'::jsonb, 
   true, null),
  ('User', 'Basic user with violation viewing and reporting capabilities', 
   '["view_violations", "create_violations"]'::jsonb, 
   true, null),
  ('Viewer', 'Read-only access to violations', 
   '["view_violations"]'::jsonb, 
   true, null);

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_permissions jsonb := '[]'::jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(DISTINCT perm), '[]'::jsonb)
  INTO user_permissions
  FROM (
    SELECT jsonb_array_elements_text(r.permissions) as perm
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = user_uuid
  ) perms;
  
  RETURN user_permissions;
END;
$$;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid uuid, permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = user_uuid
    AND r.permissions ? permission_name
  );
END;
$$;

-- Function to assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_role_to_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default "User" role
  SELECT id INTO default_role_id
  FROM roles
  WHERE name = 'User' AND is_system_role = true
  LIMIT 1;

  -- Assign the default role to the new user
  IF default_role_id IS NOT NULL THEN
    INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
    VALUES (NEW.user_id, default_role_id, NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to assign default role to new users
DROP TRIGGER IF EXISTS assign_default_role_trigger ON user_profiles;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role_to_user();