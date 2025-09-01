import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface StreetName {
  id: string;
  streetname: string;
}

export interface UnitInfo {
  id: string;
  unit_number: string;
  property_type_name: string;
}

export function useAddresses() {
  const { user } = useAuth();
  const [streetNames, setStreetNames] = useState<StreetName[]>([]);
  const [unitsByStreet, setUnitsByStreet] = useState<Record<string, UnitInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAddressData();
    }
  }, [user]);

  const loadAddressData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      console.log('=== ADDRESS DATA LOADING ===');
      console.log('User current association ID:', user.currentAssociation.id);
      console.log('User current association name:', user.currentAssociation.name);
      console.log('User ID:', user.id);

      // Load street names
      const { data: streets, error: streetsError } = await supabase
        .from('association_streetnames')
        .select('id, streetname')
        .eq('association_id', user.currentAssociation.id)
        .order('streetname');

      if (streetsError) {
        console.error('Error loading streets:', streetsError);
        throw streetsError;
      }

      console.log('Raw streets from database:', streets?.length || 0, streets);
      
      console.log('Filtered streets:', (streets || []).length, streets || []);
      setStreetNames(streets || []);

      // Load units with property type information
      const { data: units, error: unitsError } = await supabase
        .from('association_unitinfo_with_types')
        .select('id, association_streetname_id, unit_number, property_type_name')
        .eq('is_active', true)
        .in('association_streetname_id', (streets || []).map(s => s.id))
        .order('unit_number');

      if (unitsError) {
        console.error('Error loading units:', unitsError);
        throw unitsError;
      }

      console.log('Raw units from database:', units?.length || 0);
      
      // Additional client-side filtering for units to ensure they belong to streets from our association
      const streetIds = (streets || []).map(s => s.id);
      const filteredUnits = (units || []).filter(unit => 
        streetIds.includes(unit.association_streetname_id)
      );
      
      console.log('Filtered units:', filteredUnits.length);

      // Group units by street
      const groupedUnits: Record<string, UnitInfo[]> = {};
      filteredUnits.forEach(unit => {
        const streetId = unit.association_streetname_id;
        if (!groupedUnits[streetId]) {
          groupedUnits[streetId] = [];
        }
        groupedUnits[streetId].push({
          id: unit.id,
          unit_number: unit.unit_number,
          property_type_name: unit.property_type_name
        });
      });

      console.log('Grouped units by street:', Object.keys(groupedUnits).length, groupedUnits);
      setUnitsByStreet(groupedUnits);
      console.log('=== ADDRESS DATA LOADING COMPLETE ===');
    } catch (err: any) {
      console.error('Error loading address data:', err);
      setError(err.message || 'Failed to load address data');
    } finally {
      setLoading(false);
    }
  };

  const getUnitsForStreet = (streetId: string): UnitInfo[] => {
    return unitsByStreet[streetId] || [];
  };

  const formatAddress = (streetName: string, unitNumber: string): string => {
    return `${unitNumber} ${streetName}`;
  };

  return {
    streetNames,
    unitsByStreet,
    loading,
    error,
    getUnitsForStreet,
    formatAddress,
    refetch: loadAddressData
  };
}