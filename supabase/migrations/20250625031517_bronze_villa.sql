/*
  # Add contact information to companies table and insert sample associations

  1. Table Updates
    - Add address, city, state, phone, and email columns to companies table
    - Update existing policies to accommodate new columns

  2. Sample Data
    - Insert sample HOA/association records with realistic contact information
    - Includes various types of associations (HOA, Community Association, etc.)

  3. Security
    - Maintain existing RLS policies
    - Ensure new columns are accessible with existing permissions
*/

-- Add new columns to companies table
DO $$
BEGIN
  -- Add address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'address'
  ) THEN
    ALTER TABLE companies ADD COLUMN address text;
  END IF;

  -- Add city column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'city'
  ) THEN
    ALTER TABLE companies ADD COLUMN city text;
  END IF;

  -- Add state column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'state'
  ) THEN
    ALTER TABLE companies ADD COLUMN state text;
  END IF;

  -- Add zip_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE companies ADD COLUMN zip_code text;
  END IF;

  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'phone'
  ) THEN
    ALTER TABLE companies ADD COLUMN phone text;
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'email'
  ) THEN
    ALTER TABLE companies ADD COLUMN email text;
  END IF;

  -- Add website column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'website'
  ) THEN
    ALTER TABLE companies ADD COLUMN website text;
  END IF;
END $$;

-- Insert sample associations/HOAs
INSERT INTO companies (name, address, city, state, zip_code, phone, email, website) VALUES
  (
    'Sunset Hills Homeowners Association',
    '1234 Community Center Drive',
    'Phoenix',
    'AZ',
    '85001',
    '(602) 555-0123',
    'admin@sunsethillshoa.org',
    'www.sunsethillshoa.org'
  ),
  (
    'Maple Grove Community Association',
    '5678 Maple Grove Boulevard',
    'Denver',
    'CO',
    '80202',
    '(303) 555-0456',
    'info@maplegroveassociation.com',
    'www.maplegroveassociation.com'
  ),
  (
    'Riverside Townhomes HOA',
    '9012 Riverside Parkway',
    'Austin',
    'TX',
    '78701',
    '(512) 555-0789',
    'management@riversidetownhomes.net',
    'www.riversidetownhomes.net'
  ),
  (
    'Oak Valley Homeowners Association',
    '3456 Oak Valley Road',
    'Charlotte',
    'NC',
    '28202',
    '(704) 555-0321',
    'board@oakvalleyhoa.org',
    'www.oakvalleyhoa.org'
  ),
  (
    'Pine Ridge Community Association',
    '7890 Pine Ridge Circle',
    'Seattle',
    'WA',
    '98101',
    '(206) 555-0654',
    'contact@pineridgecommunity.com',
    'www.pineridgecommunity.com'
  ),
  (
    'Lakeside Estates HOA',
    '2468 Lakeside Drive',
    'Orlando',
    'FL',
    '32801',
    '(407) 555-0987',
    'office@lakesideestates.org',
    'www.lakesideestates.org'
  ),
  (
    'Mountain View Homeowners Association',
    '1357 Mountain View Lane',
    'Salt Lake City',
    'UT',
    '84101',
    '(801) 555-0246',
    'admin@mountainviewhoa.net',
    'www.mountainviewhoa.net'
  ),
  (
    'Coastal Breeze Community Association',
    '8024 Coastal Breeze Way',
    'San Diego',
    'CA',
    '92101',
    '(619) 555-0135',
    'info@coastalbreeze.org',
    'www.coastalbreeze.org'
  )
ON CONFLICT (name) DO NOTHING;

-- Add indexes for better performance on new columns
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_state ON companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

-- Log the completion
DO $$
DECLARE
  company_count integer;
BEGIN
  SELECT COUNT(*) INTO company_count FROM companies;
  RAISE NOTICE 'Sample associations added successfully';
  RAISE NOTICE 'Total associations in database: %', company_count;
END $$;