/*
  # Fix user_profiles INSERT policy for sign-up

  1. Policy Updates
    - Update the INSERT policy for user_profiles to properly handle sign-up scenarios
    - Ensure the policy allows users to create their own profile during registration
    - The policy should check that the user_id matches the authenticated user's ID

  2. Security
    - Maintain RLS security while allowing proper profile creation
    - Ensure users can only create profiles for themselves
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

-- Create a new INSERT policy that properly handles sign-up scenarios
CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure the policy is properly applied by refreshing the table's RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;