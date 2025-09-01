/*
  # Add sample street names and unit data for associations

  1. Sample Data
    - Add street names for each existing association
    - Add unit information for each street with different property types
    - Ensure realistic address data for violation reporting

  2. Street Names
    - Main Street (Single Family homes)
    - Oak Avenue (Townhouses)
    - Pine Drive (Condominiums)
    - Maple Lane (Mixed property types)

  3. Unit Information
    - Each street gets 8-10 units with realistic numbering
    - Different property types based on street
    - All units are marked as active
*/

-- Insert sample street names for existing associations
DO $$
DECLARE
  assoc_record RECORD;
  street_id uuid;
BEGIN
  -- Loop through existing associations and add street names
  FOR assoc_record IN 
    SELECT id, name FROM associations 
  LOOP
    -- Add 4 street names per association
    INSERT INTO association_streetnames (association_id, streetname) VALUES
      (assoc_record.id, 'Main Street'),
      (assoc_record.id, 'Oak Avenue'),
      (assoc_record.id, 'Pine Drive'),
      (assoc_record.id, 'Maple Lane')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Added street names for association: %', assoc_record.name;
  END LOOP;
END $$;

-- Insert sample unit information for the street names
DO $$
DECLARE
  street_record RECORD;
  single_family_type_id uuid;
  townhouse_type_id uuid;
  condo_type_id uuid;
  selected_property_type_id uuid;
  unit_counter integer;
  i integer;
BEGIN
  -- Get property type IDs
  SELECT id INTO single_family_type_id FROM property_types WHERE name = 'Single Family' AND is_system_type = true;
  SELECT id INTO townhouse_type_id FROM property_types WHERE name = 'Townhouse' AND is_system_type = true;
  SELECT id INTO condo_type_id FROM property_types WHERE name = 'Condominium' AND is_system_type = true;
  
  -- Loop through all street names and add units
  FOR street_record IN 
    SELECT asn.id, asn.streetname, asn.association_id
    FROM association_streetnames asn
  LOOP
    unit_counter := 1;
    
    -- Add different types of units based on street name
    IF street_record.streetname = 'Main Street' THEN
      -- Single family homes on Main Street (100-120 series)
      FOR i IN 1..10 LOOP
        INSERT INTO association_unitinfo (
          association_streetname_id, 
          unit_number, 
          property_type_id, 
          is_active
        ) VALUES (
          street_record.id,
          (100 + (i * 2))::text,
          single_family_type_id,
          true
        );
      END LOOP;
      
    ELSIF street_record.streetname = 'Oak Avenue' THEN
      -- Townhouses on Oak Avenue (200-220 series)
      FOR i IN 1..10 LOOP
        INSERT INTO association_unitinfo (
          association_streetname_id, 
          unit_number, 
          property_type_id, 
          is_active
        ) VALUES (
          street_record.id,
          (200 + (i * 2))::text,
          townhouse_type_id,
          true
        );
      END LOOP;
      
    ELSIF street_record.streetname = 'Pine Drive' THEN
      -- Condominiums on Pine Drive (300-320 series)
      FOR i IN 1..10 LOOP
        INSERT INTO association_unitinfo (
          association_streetname_id, 
          unit_number, 
          property_type_id, 
          is_active
        ) VALUES (
          street_record.id,
          (300 + (i * 2))::text,
          condo_type_id,
          true
        );
      END LOOP;
      
    ELSIF street_record.streetname = 'Maple Lane' THEN
      -- Mix of property types on Maple Lane (400-420 series)
      FOR i IN 1..8 LOOP
        -- Determine property type based on unit number
        IF i % 3 = 0 THEN
          selected_property_type_id := condo_type_id;
        ELSIF i % 2 = 0 THEN
          selected_property_type_id := townhouse_type_id;
        ELSE
          selected_property_type_id := single_family_type_id;
        END IF;
        
        INSERT INTO association_unitinfo (
          association_streetname_id, 
          unit_number, 
          property_type_id, 
          is_active
        ) VALUES (
          street_record.id,
          (400 + (i * 2))::text,
          selected_property_type_id,
          true
        );
      END LOOP;
      
    ELSE
      -- Default case for any other street names (500 series, single family)
      FOR i IN 1..8 LOOP
        INSERT INTO association_unitinfo (
          association_streetname_id, 
          unit_number, 
          property_type_id, 
          is_active
        ) VALUES (
          street_record.id,
          (500 + (i * 2))::text,
          single_family_type_id,
          true
        );
      END LOOP;
    END IF;
    
    RAISE NOTICE 'Added units for street: % (Association ID: %)', street_record.streetname, street_record.association_id;
  END LOOP;
END $$;

-- Log completion
DO $$
DECLARE
  street_count integer;
  unit_count integer;
BEGIN
  SELECT COUNT(*) INTO street_count FROM association_streetnames;
  SELECT COUNT(*) INTO unit_count FROM association_unitinfo;
  
  RAISE NOTICE 'Sample address data added successfully';
  RAISE NOTICE 'Total street names: %', street_count;
  RAISE NOTICE 'Total units: %', unit_count;
END $$;