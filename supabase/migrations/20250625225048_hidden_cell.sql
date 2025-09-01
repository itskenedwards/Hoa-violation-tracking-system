/*
  # Fix user profile creation during registration

  1. Changes
    - Create a function to handle user profile creation that bypasses RLS
    - Update the signup process to use this function
    - Ensure proper error handling and validation

  2. Security
    - Function is security definer to bypass RLS temporarily
    - Validates that the user exists and association is valid
    - Only allows creation of profile for the authenticated user
*/

-- Create a function to safely create user profiles
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
BEGIN
  -- Validate that the user_id matches the authenticated user
  IF p_user_id != auth.uid() THEN
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

-- Also create a simpler policy for direct inserts (as backup)
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM associations 
      WHERE id = user_profiles.association_id
    )
  );