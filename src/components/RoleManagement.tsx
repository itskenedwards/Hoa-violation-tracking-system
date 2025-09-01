import { useState } from 'react';
import { Shield, Plus, Edit, Trash2, Users, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRoles';
import { Role, Permission, PERMISSION_DESCRIPTIONS } from '../types/roles';

export default function RoleManagement() {
  const { hasPermission } = useAuth();
  const { roles, loading, createRole, updateRole, deleteRole } = useRoles();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as Permission[],
  });

  if (!hasPermission('manage_roles')) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <Shield size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p>You don't have permission to manage roles.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        setEditingRole(null);
      } else {
        await createRole(formData);
        setShowCreateForm(false);
      }
      
      setFormData({ name: '', description: '', permissions: [] });
    } catch (error) {
      console.error('Error saving role:', error);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions as Permission[],
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (roleId: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(roleId);
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingRole(null);
    setFormData({ name: '', description: '', permissions: [] });
  };

  const togglePermission = (permission: Permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Role Management</h2>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Role</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{role.name}</h3>
                  {role.description && (
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                  )}
                </div>
                {!role.is_system_role && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEdit(role)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center text-sm text-gray-600">
                  <Users size={14} className="mr-1" />
                  <span>{role.permissions.length} permissions</span>
                </div>
                {role.is_system_role && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    System Role
                  </span>
                )}
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-2">Permissions:</div>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 7).map(permission => (
                    <span
                      key={permission}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                  {role.permissions.length > 7 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      +{role.permissions.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter role name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe this role's purpose and responsibilities"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissions
                </label>
                <div className="space-y-3">
                  {Object.entries(PERMISSION_DESCRIPTIONS).map(([permission, description]) => (
                    <div key={permission} className="flex items-start space-x-3">
                      <button
                        type="button"
                        onClick={() => togglePermission(permission as Permission)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          formData.permissions.includes(permission as Permission)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {formData.permissions.includes(permission as Permission) && (
                          <Check size={12} />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-gray-800">
                          {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-sm text-gray-600">{description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>{editingRole ? 'Update' : 'Create'} Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}