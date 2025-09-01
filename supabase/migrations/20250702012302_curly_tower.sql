/*
  # Split full_name into first_name and last_name

  1. Schema Changes
    - Add first_name and last_name columns to user_profiles table
    - Migrate existing full_name data to the new columns
    - Drop the old full_name column after migration

  2. Function Updates
    - Update create_user_profile function to accept separate name parameters
    - Add validation for required first_name field

  3. Data Migration
    - Parse existing full_name values into first_name and last_name
    - Handle single names, two names, and multiple names appropriately
*/

-- Add new columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Migrate existing full_name data to first_name and last_name
DO $$
DECLARE
  profile_record RECORD;
  name_parts text[];
  v_first_name text;
  v_last_name text;
BEGIN
  -- Loop through all existing profiles and split the full_name
  FOR profile_record IN 
    SELECT id, full_name FROM user_profiles WHERE full_name IS NOT NULL
  LOOP
    -- Split the full name by spaces
    name_parts := string_to_array(trim(profile_record.full_name), ' ');
    
    -- Handle different cases
    IF array_length(name_parts, 1) = 1 THEN
      -- Single name - use as first name, empty last name
      v_first_name := name_parts[1];
      v_last_name := '';
    ELSIF array_length(name_parts, 1) = 2 THEN
      -- Two names - first and last
      v_first_name := name_parts[1];
      v_last_name := name_parts[2];
    ELSE
      -- Multiple names - first name is first, last name is everything else
      v_first_name := name_parts[1];
      v_last_name := array_to_string(name_parts[2:array_length(name_parts, 1)], ' ');
    END IF;
    
    -- Update the record using the variables
    UPDATE user_profiles 
    SET first_name = v_first_name, last_name = v_last_name
    WHERE id = profile_record.id;
  END LOOP;
  
  RAISE NOTICE 'Migrated % profiles from full_name to first_name/last_name', 
    (SELECT COUNT(*) FROM user_profiles WHERE full_name IS NOT NULL);
END $$;

-- Make the new columns required after migration
ALTER TABLE user_profiles 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Set default empty string for last_name to handle single names
ALTER TABLE user_profiles 
ALTER COLUMN last_name SET DEFAULT '';

-- Drop the old full_name column
ALTER TABLE user_profiles DROP COLUMN full_name;

-- Update the create_user_profile function
DROP FUNCTION IF EXISTS create_user_profile(uuid, uuid, text);

CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_association_id uuid,
  p_first_name text,
  p_last_name text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  profile_id uuid;
  is_admin boolean := false;
BEGIN
  -- Check if the current user is a super admin or has manage_users permission
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = auth.uid()
    AND (
      (r.name = 'Super Admin' AND r.is_system_role = true)
      OR r.permissions ? 'manage_users'
      OR r.permissions ? 'manage_company'
    )
  ) INTO is_admin;

  -- Validate user permissions
  IF NOT is_admin AND p_user_id != auth.uid() THEN
    RETURN json_build_object('error', 'Unauthorized: Cannot create profile for another user');
  END IF;

  -- Validate that the association exists
  IF NOT EXISTS (SELECT 1 FROM associations WHERE id = p_association_id) THEN
    RETURN json_build_object('error', 'Invalid association ID');
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
    RETURN json_build_object('error', 'Profile already exists for this user');
  END IF;

  -- For non-admin users, ensure they can only create profiles in their own association
  IF NOT is_admin THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.association_id = p_association_id
    ) THEN
      RETURN json_build_object('error', 'Cannot create profile in a different association');
    END IF;
  END IF;

  -- Validate names are not empty
  IF trim(p_first_name) = '' THEN
    RETURN json_build_object('error', 'First name cannot be empty');
  END IF;

  -- Create the user profile
  INSERT INTO user_profiles (user_id, association_id, first_name, last_name)
  VALUES (p_user_id, p_association_id, trim(p_first_name), trim(p_last_name))
  RETURNING id INTO profile_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'profile_id', profile_id,
    'message', 'Profile created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', 'Failed to create profile: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, uuid, text, text) TO authenticated;

-- Log the completion
DO $$
DECLARE
  profile_count integer;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  RAISE NOTICE 'Successfully split full_name into first_name and last_name';
  RAISE NOTICE 'Updated % user profiles', profile_count;
  RAISE NOTICE 'Updated create_user_profile function to use separate name fields';
END $$;