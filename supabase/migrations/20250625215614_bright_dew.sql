/*
  # Clean up existing accounts and prepare for OAuth

  1. Cleanup Actions
    - Remove all existing user role assignments
    - Remove all existing user profiles
    - This will effectively remove all user accounts while preserving associations and system roles

  2. Notes
    - Auth users in auth.users table will need to be manually removed via Supabase dashboard
    - This migration only cleans up the public schema tables
    - System roles and associations are preserved
*/

-- Remove all user role assignments
DELETE FROM user_role_assignments;

-- Remove all user profiles
DELETE FROM user_profiles;

-- Log the cleanup action
DO $$
BEGIN
  RAISE NOTICE 'Cleanup completed successfully';
  RAISE NOTICE 'All user profiles and role assignments have been removed';
  RAISE NOTICE 'Auth users should be manually removed from Supabase dashboard under Authentication > Users';
  RAISE NOTICE 'Associations and system roles have been preserved';
END $$;