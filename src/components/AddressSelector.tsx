import React, { useState } from 'react';
import { MapPin, ChevronDown, Home } from 'lucide-react';
import { useAddresses } from '../hooks/useAddresses';
import { useAuth } from '../hooks/useAuth';

interface AddressSelectorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function AddressSelector({ 
  value, 
  onChange, 
  required = false 
}: AddressSelectorProps) {
  const { streetNames, getUnitsForStreet, formatAddress, loading, error } = useAddresses();
  const [selectedStreetId, setSelectedStreetId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const { user } = useAuth();

  // Debug logging
  React.useEffect(() => {
    console.log('=== ADDRESS SELECTOR DEBUG ===');
    console.log('Current user association:', user?.currentAssociation?.name, user?.currentAssociation?.id);
    console.log('Available street names:', streetNames.length, streetNames);
    console.log('Selected street ID:', selectedStreetId);
    console.log('Selected unit ID:', selectedUnitId);
    console.log('Current value:', value);
    console.log('=== END DEBUG ===');
  }, [streetNames]);

  // Parse existing value to set initial selections
  React.useEffect(() => {
    if (value && streetNames.length > 0) {
      // Try to match the value with existing street/unit combinations
      for (const street of streetNames) {
        const units = getUnitsForStreet(street.id);
        for (const unit of units) {
          const formattedAddress = formatAddress(street.streetname, unit.unit_number);
          if (formattedAddress === value) {
            setSelectedStreetId(street.id);
            setSelectedUnitId(unit.id);
            return;
          }
        }
      }
    }
  }, [value, streetNames]);

  const handleStreetChange = (streetId: string) => {
    setSelectedStreetId(streetId);
    setSelectedUnitId('');
    onChange('');
  };

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    
    if (selectedStreetId && unitId) {
      const street = streetNames.find(s => s.id === selectedStreetId);
      const units = getUnitsForStreet(selectedStreetId);
      const unit = units.find(u => u.id === unitId);
      
      if (street && unit) {
        const address = formatAddress(street.streetname, unit.unit_number);
        onChange(address);
      }
    }
  };

  const selectedStreet = streetNames.find(s => s.id === selectedStreetId);
  const availableUnits = selectedStreetId ? getUnitsForStreet(selectedStreetId) : [];

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Street Name *
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            <span className="text-gray-500">Loading streets...</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Unit Number *
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            <span className="text-gray-500">Loading units...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
          Error loading address data: {error}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Address *
          </label>
          <div className="relative">
            <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="123 Main St"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Street Name *
        </label>
        <div className="relative">
          <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={selectedStreetId}
            onChange={(e) => handleStreetChange(e.target.value)}
            required={required}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="">Select a street</option>
            {streetNames.map(street => (
              <option key={street.id} value={street.id}>
                {street.streetname}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Unit Number *
        </label>
        <div className="relative">
          <Home size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={selectedUnitId}
            onChange={(e) => handleUnitChange(e.target.value)}
            required={required}
            disabled={!selectedStreetId}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {selectedStreetId ? 'Select a unit' : 'Select a street first'}
            </option>
            {availableUnits.map(unit => (
              <option key={unit.id} value={unit.id}>
                {unit.unit_number} ({unit.property_type_name})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>
        {selectedStreetId && availableUnits.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">
            No units available for this street.
          </p>
        )}
      </div>

      {selectedStreet && selectedUnitId && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <MapPin size={16} className="text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Selected Address: {value}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}