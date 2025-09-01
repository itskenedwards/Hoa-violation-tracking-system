import { Home, LogOut, User, Building2, Shield, ChevronDown } from 'lucide-react';
import { Plus, Tag } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import RoleManagement from './RoleManagement';
import UserManagement from './UserManagement';
import AssociationManagement from './AssociationManagement';
import ViolationCategoryManagement from './ViolationCategoryManagement';

interface HeaderProps {
  onAddViolation: () => void;
}

export default function Header({ onAddViolation }: HeaderProps) {
  const { user, signOut, hasPermission, clearAuthState, switchAssociation } = useAuth();
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showAssociationManagement, setShowAssociationManagement] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showDebugMenu, setShowDebugMenu] = useState(false);
  const [showAssociationMenu, setShowAssociationMenu] = useState(false);

  const handleClearAuthState = async () => {
    if (window.confirm('This will clear all authentication data and log you out. Continue?')) {
      console.log('Clearing auth state from header debug menu...');
      const cleared = await clearAuthState();
      
      console.log('Auth state cleared:', cleared);
      console.log('Forcing navigation to login...');
      
      // Force navigation to root path after clearing auth
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 100);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Home className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HOA Violations Tracker</h1>
                <p className="text-sm text-gray-600">Manage and track community violations</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <button
                  onClick={() => setShowAssociationMenu(!showAssociationMenu)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  title="Switch Association"
                >
                  <Building2 className="h-5 w-5" />
                  <span>{user?.currentAssociation.name}</span>
                  {user && user.associations && user.associations.length > 1 && (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {showAssociationMenu && user && user.associations && user.associations.length > 1 && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
                    <div className="py-1">
                      {user.associations.map(association => (
                        <button
                          key={association.id}
                          onClick={() => {
                            switchAssociation(association.id);
                            setShowAssociationMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            association.id === user.currentAssociation.id
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <Building2 className="h-6 w-6 mr-2" />
                            <span>{association.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user?.profile.first_name ? `${user.profile.first_name} ${user.profile.last_name}`.trim() : user?.email}</span>
                {user?.roles.length && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {user.roles[0].name}
                  </span>
                )}
              </div>

              {(hasPermission('create_violations') || hasPermission('manage_violations')) && (
                <button
                  onClick={onAddViolation}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  title="Add Violation"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}

              {hasPermission('manage_roles') && (
                <button
                  onClick={() => setShowRoleManagement(true)}
                  className="text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                  title="Manage Roles"
                >
                  <Shield className="h-4 w-4" />
                </button>
              )}

              {hasPermission('manage_users') && (
                <button
                  onClick={() => setShowUserManagement(true)}
                  className="text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                  title="Manage Users"
                >
                  <User className="h-5 w-5" />
                </button>
              )}

              {(hasPermission('manage_violations') || hasPermission('manage_company')) && (
                <button
                  onClick={() => setShowCategoryManagement(true)}
                  className="text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                  title="Manage Categories"
                >
                  <Tag className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>

              {hasPermission('manage_company') && (
                <button
                  onClick={() => setShowAssociationManagement(true)}
                  className="text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                  title="Manage Associations"
                >
                  <Building2 className="h-5 w-5" />
                </button>
              )}

              {/* Debug menu - only show in development or for super admins */}
              {(import.meta.env.DEV || user?.roles.some(r => r.name === 'Super Admin')) && (
                <div className="relative">
                  <button
                    onClick={() => setShowDebugMenu(!showDebugMenu)}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                    title="Debug Menu"
                  >
                    ⚙️
                  </button>
                  {showDebugMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
                      <button
                        onClick={handleClearAuthState}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Clear Auth State
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showRoleManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Role Management</h2>
              <button
                onClick={() => setShowRoleManagement(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <RoleManagement />
            </div>
          </div>
        </div>
      )}

      {showUserManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
              <button
                onClick={() => setShowUserManagement(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <UserManagement />
            </div>
          </div>
        </div>
      )}

      {showAssociationManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Association Management</h2>
              <button
                onClick={() => setShowAssociationManagement(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <AssociationManagement />
            </div>
          </div>
        </div>
      )}

      {showCategoryManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Category Management</h2>
              <button
                onClick={() => setShowCategoryManagement(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <ViolationCategoryManagement />
            </div>
          </div>
        </div>
      )}
    </>
  );
}