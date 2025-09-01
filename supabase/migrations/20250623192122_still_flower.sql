/*
  # Clean up orphaned user data

  1. Cleanup Actions
    - Remove role assignments for users that don't have profiles
    - This ensures data consistency in the public schema

  2. Notes
    - This migration only works with public schema tables
    - Auth users without profiles would need manual cleanup via Supabase dashboard
    - Focuses on maintaining referential integrity in our application tables
*/

-- Remove any role assignments for users without profiles
-- This ensures we don't have dangling references
DELETE FROM user_role_assignments 
WHERE user_id NOT IN (
  SELECT user_id 
  FROM user_profiles 
  WHERE user_id IS NOT NULL
);

-- Log the cleanup action
DO $$
DECLARE
  role_assignments_removed integer;
BEGIN
  -- Get the count of removed assignments from the previous DELETE
  GET DIAGNOSTICS role_assignments_removed = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup completed successfully';
  RAISE NOTICE 'Role assignments removed for users without profiles: %', COALESCE(role_assignments_removed, 0);
  
  -- Provide guidance for further cleanup if needed
  RAISE NOTICE 'Note: If there are auth users without profiles, they should be removed manually';
  RAISE NOTICE 'via the Supabase dashboard under Authentication > Users';
END $$;