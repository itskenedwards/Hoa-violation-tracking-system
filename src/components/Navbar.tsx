import React, { useState } from 'react';
import { Menu, X, User, LogOut, Settings, ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAssociation } from '../contexts/AssociationContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAssociationDropdownOpen, setIsAssociationDropdownOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentAssociation, userAssociations, switchAssociation } = useAssociation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleAssociationSwitch = async (associationId: string) => {
    await switchAssociation(associationId);
    setIsAssociationDropdownOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">HOA Manager</h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Association Selector */}
            {userAssociations && userAssociations.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setIsAssociationDropdownOpen(!isAssociationDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  <span className="max-w-32 truncate">
                    {currentAssociation?.name || 'Select Association'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isAssociationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                        Switch Association
                      </div>
                      {userAssociations.map((association) => (
                        <button
                          key={association.id}
                          onClick={() => handleAssociationSwitch(association.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            currentAssociation?.id === association.id
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{association.name}</div>
                              {association.city && association.state && (
                                <div className="text-xs text-gray-500">
                                  {association.city}, {association.state}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-4">
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center space-x-2 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <User className="h-8 w-8 rounded-full bg-gray-300 p-1" />
                    <span className="text-gray-700">{user.email}</span>
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                {isOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} border-t border-gray-200`}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {/* Mobile Association Selector */}
              {userAssociations && userAssociations.length > 1 && (
                <div className="border-b border-gray-200 pb-3 mb-3">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Current Association
                  </div>
                  <div className="space-y-1">
                    {userAssociations.map((association) => (
                      <button
                        key={association.id}
                        onClick={() => handleAssociationSwitch(association.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          currentAssociation?.id === association.id
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{association.name}</div>
                            {association.city && association.state && (
                              <div className="text-xs text-gray-500">
                                {association.city}, {association.state}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {user && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center px-5">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 rounded-full bg-gray-300 p-2" />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 px-2 space-y-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 w-full text-left"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}