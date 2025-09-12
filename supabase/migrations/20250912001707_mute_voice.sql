/*
  # Fix user profile creation policy for new signups

  1. Policy Updates
    - Update the INSERT policy on user_profiles to allow new users to create their initial profile
    - Allow users to create profiles in any association during signup
    - Maintain security by ensuring users can only create profiles for themselves

  2. Security
    - Users can only create profiles with their own user_id
    - Existing policies for reading and updating profiles remain unchanged
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

-- Create a new INSERT policy that allows profile creation during signup
CREATE POLICY "Users can create their initial profile during signup"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also ensure the existing UPDATE policy allows users to update their own profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());