import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  addresses: string[];
  placeholder?: string;
  required?: boolean;
}

export default function AddressInput({ 
  value, 
  onChange, 
  addresses, 
  placeholder = "123 Main St",
  required = false 
}: AddressInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredAddresses, setFilteredAddresses] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length > 0) {
      const filtered = addresses
        .filter(addr => 
          addr.toLowerCase().includes(value.toLowerCase()) && 
          addr.toLowerCase() !== value.toLowerCase()
        )
        .slice(0, 10); // Limit to 10 suggestions
      setFilteredAddresses(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredAddresses([]);
      setIsOpen(false);
    }
  }, [value, addresses]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleAddressSelect = (address: string) => {
    onChange(address);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (filteredAddresses.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
        />
        {filteredAddresses.length > 0 && (
          <ChevronDown 
            size={18} 
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </div>

      {isOpen && filteredAddresses.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredAddresses.map((address, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAddressSelect(address)}
              className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none flex items-center"
            >
              <MapPin size={14} className="mr-2 text-gray-400" />
              <span className="text-gray-800">{address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}