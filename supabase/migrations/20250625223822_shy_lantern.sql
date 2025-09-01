/*
  # Fix user_profiles RLS policy for signup

  1. Policy Updates
    - Update the INSERT policy for user_profiles to handle signup scenarios properly
    - Ensure the policy works correctly during the signup flow
    - Add better error handling for profile creation

  2. Security
    - Maintain RLS security while allowing proper profile creation
    - Ensure users can only create profiles for themselves
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

-- Create a new INSERT policy that properly handles sign-up scenarios
-- This policy allows users to create a profile for their own user_id
CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also ensure the SELECT policy allows users to read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;

CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());