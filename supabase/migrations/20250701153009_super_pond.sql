/*
  # Fix create_user_profile function for super admin user creation

  1. Problem
    - The create_user_profile function only allows users to create profiles for themselves
    - When super admins create users, they need to create profiles for other users
    - Current validation prevents this legitimate use case

  2. Solution
    - Update the function to allow super admins to create profiles for other users
    - Keep security checks for regular users
    - Allow users with 'manage_users' permission to create profiles for others

  3. Security
    - Regular users can still only create profiles for themselves
    - Super admins and users with manage_users permission can create profiles for others
    - Association validation is still enforced
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS create_user_profile(uuid, uuid, text);

-- Create updated function that allows super admins to create profiles for other users
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

  -- Create the user profile
  INSERT INTO user_profiles (user_id, association_id, full_name)
  VALUES (p_user_id, p_association_id, p_full_name)
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
GRANT EXECUTE ON FUNCTION create_user_profile(uuid, uuid, text) TO authenticated;