/*
  # Update user_profiles table structure for first_name and last_name

  1. Schema Changes
    - Add first_name and last_name columns if they don't exist
    - Migrate data from full_name to split fields if full_name exists
    - Update constraints and defaults as needed

  2. Function Updates
    - Update create_user_profile function to use separate name fields
    - Add proper validation for name fields

  3. Data Migration
    - Only migrate if full_name column exists and has data
    - Handle various name formats gracefully
*/

-- Add new columns only if they don't exist
DO $$
BEGIN
  -- Add first_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN first_name text;
    RAISE NOTICE 'Added first_name column to user_profiles';
  ELSE
    RAISE NOTICE 'first_name column already exists in user_profiles';
  END IF;

  -- Add last_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_name text;
    RAISE NOTICE 'Added last_name column to user_profiles';
  ELSE
    RAISE NOTICE 'last_name column already exists in user_profiles';
  END IF;
END $$;

-- Migrate existing full_name data to first_name and last_name if full_name column exists
DO $$
DECLARE
  profile_record RECORD;
  name_parts text[];
  v_first_name text;
  v_last_name text;
  migration_count integer := 0;
BEGIN
  -- Check if full_name column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    RAISE NOTICE 'full_name column exists, starting migration...';
    
    -- Loop through all existing profiles and split the full_name
    FOR profile_record IN 
      SELECT id, full_name FROM user_profiles 
      WHERE full_name IS NOT NULL 
      AND (first_name IS NULL OR last_name IS NULL)
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
      
      migration_count := migration_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Migrated % profiles from full_name to first_name/last_name', migration_count;
  ELSE
    RAISE NOTICE 'full_name column does not exist, skipping data migration';
  END IF;
END $$;

-- Ensure proper constraints and defaults are set
DO $$
BEGIN
  -- Set NOT NULL constraint on first_name if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' 
    AND column_name = 'first_name' 
    AND is_nullable = 'YES'
  ) THEN
    -- Set default empty string for any NULL values before making it NOT NULL
    UPDATE user_profiles SET first_name = '' WHERE first_name IS NULL;
    ALTER TABLE user_profiles ALTER COLUMN first_name SET NOT NULL;
    RAISE NOTICE 'Set first_name column to NOT NULL';
  END IF;

  -- Set NOT NULL constraint and default on last_name if not already set
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' 
    AND column_name = 'last_name' 
    AND is_nullable = 'YES'
  ) THEN
    -- Set default empty string for any NULL values before making it NOT NULL
    UPDATE user_profiles SET last_name = '' WHERE last_name IS NULL;
    ALTER TABLE user_profiles ALTER COLUMN last_name SET NOT NULL;
    RAISE NOTICE 'Set last_name column to NOT NULL';
  END IF;

  -- Set default for last_name if not already set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' 
    AND column_name = 'last_name' 
    AND column_default = '''::text'
  ) THEN
    ALTER TABLE user_profiles ALTER COLUMN last_name SET DEFAULT '';
    RAISE NOTICE 'Set default empty string for last_name column';
  END IF;
END $$;

-- Drop the old full_name column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN full_name;
    RAISE NOTICE 'Dropped full_name column from user_profiles';
  ELSE
    RAISE NOTICE 'full_name column does not exist, nothing to drop';
  END IF;
END $$;

-- Update the create_user_profile function
DROP FUNCTION IF EXISTS create_user_profile(uuid, uuid, text);
DROP FUNCTION IF EXISTS create_user_profile(uuid, uuid, text, text);

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

-- Also create a backward-compatible version that accepts full_name and splits it
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid,
  p_association_id uuid,
  p_full_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  name_parts text[];
  v_first_name text;
  v_last_name text;
BEGIN
  -- Split the full name by spaces
  name_parts := string_to_array(trim(p_full_name), ' ');
  
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

  -- Call the main function with split names
  RETURN create_user_profile(p_user_id, p_association_id, v_first_name, v_last_name);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, uuid, text) TO authenticated;

-- Log the completion
DO $$
DECLARE
  profile_count integer;
  has_first_name boolean;
  has_last_name boolean;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'first_name'
  ) INTO has_first_name;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_name'
  ) INTO has_last_name;
  
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Total user profiles: %', profile_count;
  RAISE NOTICE 'Has first_name column: %', has_first_name;
  RAISE NOTICE 'Has last_name column: %', has_last_name;
  RAISE NOTICE 'Updated create_user_profile function to use separate name fields';
  RAISE NOTICE 'Created backward-compatible function that accepts full_name';
END $$;