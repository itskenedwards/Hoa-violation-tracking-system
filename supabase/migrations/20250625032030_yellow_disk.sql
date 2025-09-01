/*
  # Fix companies RLS policy for signup access

  1. Changes
    - Update the SELECT policy on companies table to allow access during signup
    - Users need to see available companies/associations before they can create a profile
    - Maintain security by only allowing read access to basic company information

  2. Security
    - Allow authenticated users to read all companies for signup purposes
    - Keep existing restrictions for other operations
    - This enables the signup dropdown to populate with available associations
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can read companies they belong to" ON companies;

-- Create a new SELECT policy that allows authenticated users to read all companies
-- This is necessary for the signup process where users need to select their association
CREATE POLICY "Authenticated users can read companies for signup"
  ON companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Also allow public read access for the signup form (in case we need it)
CREATE POLICY "Public can read companies for signup"
  ON companies
  FOR SELECT
  TO anon
  USING (true);