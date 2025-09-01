/*
  # Update companies RLS policy for admin-only creation

  1. Changes
    - Remove the existing INSERT policy that allows any authenticated user to create companies
    - Add a new INSERT policy that only allows users with 'manage_company' permission to create companies
    - This ensures only administrators can create companies

  2. Security
    - Companies can only be created by users with proper permissions
    - Regular users can still read companies they belong to
    - Maintains existing SELECT policy for company access
*/

-- Drop the existing INSERT policy that allows any authenticated user to create companies
DROP POLICY IF EXISTS "Users can create companies" ON companies;

-- Create a new INSERT policy that only allows users with manage_company permission
CREATE POLICY "Admins can create companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_company'
    )
  );