/*
  # Create violations table for HOA violation tracking

  1. New Tables
    - `violations`
      - `id` (uuid, primary key)
      - `association_id` (uuid, foreign key to associations)
      - `address` (text, the property address)
      - `description` (text, violation description)
      - `category` (text, violation category)
      - `status` (text, violation status)
      - `priority` (text, violation priority)
      - `date_reported` (date, when violation was reported)
      - `date_resolved` (date, when violation was resolved, nullable)
      - `reported_by` (text, who reported the violation)
      - `notes` (text, additional notes, nullable)
      - `photos` (jsonb, array of photo URLs, nullable)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `violations` table
    - Add policies for association-based access control
    - Users can only see violations from their association

  3. Indexes
    - Add indexes for better query performance
*/

-- Create violations table
CREATE TABLE IF NOT EXISTS violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES associations(id) ON DELETE CASCADE,
  address text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'Landscaping', 'Parking', 'Noise', 'Architectural', 
    'Pet', 'Trash/Recycling', 'Pool/Spa', 'Other'
  )),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN (
    'Pending', 'In Progress', 'Resolved', 'Dismissed'
  )),
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN (
    'Low', 'Medium', 'High'
  )),
  date_reported date NOT NULL DEFAULT CURRENT_DATE,
  date_resolved date,
  reported_by text NOT NULL,
  notes text,
  photos jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_violations_association_id ON violations(association_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_priority ON violations(priority);
CREATE INDEX IF NOT EXISTS idx_violations_category ON violations(category);
CREATE INDEX IF NOT EXISTS idx_violations_date_reported ON violations(date_reported);
CREATE INDEX IF NOT EXISTS idx_violations_created_by ON violations(created_by);

-- Enable Row Level Security
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Create policies for violations
CREATE POLICY "Users can read violations in their association"
  ON violations
  FOR SELECT
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create violations in their association"
  ON violations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND (r.permissions ? 'create_violations' OR r.permissions ? 'manage_violations')
    )
  );

CREATE POLICY "Users can update violations in their association"
  ON violations
  FOR UPDATE
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_violations'
    )
  )
  WITH CHECK (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_violations'
    )
  );

CREATE POLICY "Users can delete violations in their association"
  ON violations
  FOR DELETE
  TO authenticated
  USING (
    association_id IN (
      SELECT association_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN user_role_assignments ura ON up.user_id = ura.user_id
      JOIN roles r ON ura.role_id = r.id
      WHERE up.user_id = auth.uid()
      AND r.permissions ? 'manage_violations'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_violations_updated_at
  BEFORE UPDATE ON violations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();