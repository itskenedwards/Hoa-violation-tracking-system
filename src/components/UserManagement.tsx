import { useState } from 'react';
import { Users, Plus, Edit, Trash2, User, Shield, Search, ChevronDown, Building2, X, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserManagement } from '../hooks/useUserManagement';

export default function UserManagement() {
  const { hasPermission } = useAuth();
  const { 
    users, 
    associations, 
    loading, 
    createUser, 
    updateUser, 
    deleteUser,
    addUserToAssociation,
    removeUserFromAssociation
  } = useUserManagement();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [managingAssociations, setManagingAssociations] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAssociation, setFilterAssociation] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    selectedAssociations: [] as string[],
  });

  if (!hasPermission('manage_users')) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <Shield size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p>You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingUser) {
        console.log('Attempting to update user:', editingUser.id, 'with data:', formData);
        await updateUser(editingUser.id, formData);
        setEditingUser(null);
        alert('User updated successfully!');
      } else {
        console.log('Attempting to create user with data:', formData);
        await createUser({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          associationId: formData.selectedAssociations[0]
        });
        setShowCreateForm(false);
        alert('User created successfully!');
      }
      
      setFormData({ email: '', password: '', firstName: '', lastName: '', selectedAssociations: [] });
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save user: ${errorMessage}`);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    // Get all association IDs the user is a member of
    const userAssociationIds = user.memberships?.map((m: any) => m.association_id) || [];
    console.log('Setting up edit form for user:', user.email, 'with associations:', userAssociationIds);
    
    setFormData({
      email: user.email,
      password: '', // Don't populate password for security
      firstName: user.profile.first_name,
      lastName: user.profile.last_name,
      selectedAssociations: userAssociationIds, 
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    setManagingAssociations(null);
    setFormData({ email: '', password: '', firstName: '', lastName: '', selectedAssociations: [] });
  };

  const handleAssociationToggle = (associationId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedAssociations: prev.selectedAssociations.includes(associationId)
        ? prev.selectedAssociations.filter(id => id !== associationId)
        : [...prev.selectedAssociations, associationId]
    }));
  };

  const handleManageAssociations = (user: any) => {
    setManagingAssociations(user);
  };

  const handleAddAssociation = async (userId: string, associationId: string) => {
    try {
      await addUserToAssociation(userId, associationId);
    } catch (error) {
      console.error('Error adding association:', error);
      alert('Failed to add association: ' + (error as Error).message);
    }
  };

  const handleRemoveAssociation = async (membershipId: string) => {
    if (window.confirm('Are you sure you want to remove this user from this association?')) {
      try {
        await removeUserFromAssociation(membershipId);
      } catch (error) {
        console.error('Error removing association:', error);
        alert('Failed to remove association: ' + (error as Error).message);
      }
    }
  };
  // Filter users based on search and association filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.profile.first_name && user.profile.last_name 
                           ? `${user.profile.first_name} ${user.profile.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
                           : false);
    const matchesAssociation = !filterAssociation || 
                              user.profile.primary_association_id === filterAssociation ||
                              user.memberships.some(m => m.association_id === filterAssociation);
    return matchesSearch && matchesAssociation;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create User</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filterAssociation}
              onChange={(e) => setFilterAssociation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">All Associations</option>
              {associations.map(association => (
                <option key={association.id} value={association.id}>
                  {association.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Primary Association
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  All Associations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.profile.first_name && user.profile.last_name 
                            ? `${user.profile.first_name} ${user.profile.last_name}`.trim()
                            : 'No name set'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.primaryAssociation?.name || 'No primary association'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {user.memberships.map(membership => (
                        <span
                          key={membership.id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center"
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          {membership.association.name}
                        </span>
                      ))}
                      {user.memberships.length === 0 && (
                        <span className="text-sm text-gray-500">No associations</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map(role => (
                        <span
                          key={role.id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.profile.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit user"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleManageAssociations(user)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Manage associations"
                      >
                        <Building2 size={16} />
                      </button>
                      {user.id !== user?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">
              {searchTerm || filterAssociation 
                ? "Try adjusting your search or filter criteria."
                : "Create your first user to get started."
              }
            </p>
          </div>
        )}
      </div>
      </div>

      {/* Create/Edit User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="john@example.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingUser ? 'Associations *' : 'Primary Association *'}
                </label>
                
                {editingUser ? (
                  <div>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                      {associations.map(association => (
                        <label key={association.id} className="flex items-center space-x-3 cursor-pointer hover:bg-white rounded p-2 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.selectedAssociations.includes(association.id)}
                            onChange={() => handleAssociationToggle(association.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700 font-medium">{association.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Check the associations this user should have access to. Users can belong to multiple associations.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.selectedAssociations[0] || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      selectedAssociations: e.target.value ? [e.target.value] : [] 
                    }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select an association</option>
                    {associations.map(association => (
                      <option key={association.id} value={association.id}>
                        {association.name}
                      </option>
                    ))}
                  </select>
                )}
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
                  <span>{editingUser ? 'Update' : 'Create'} User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Manage Associations Modal */}
      {managingAssociations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Manage Associations for {managingAssociations.profile.first_name} {managingAssociations.profile.last_name}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Current Associations</h3>
                <div className="space-y-3">
                  {managingAssociations.memberships.map((membership: any) => (
                    <div key={membership.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-gray-900">{membership.association.name}</div>
                          <div className="text-sm text-gray-500">
                            Joined: {new Date(membership.joined_at).toLocaleDateString()}
                            {membership.association_id === managingAssociations.profile.primary_association_id && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Primary</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAssociation(membership.id)}
                        className="text-red-600 hover:text-red-800 transition-colors p-1"
                        title="Remove from association"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {managingAssociations.memberships.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No association memberships</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Add to Association</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {associations
                    .filter(assoc => !managingAssociations.memberships.some((m: any) => m.association_id === assoc.id))
                    .map(association => (
                    <button
                      key={association.id}
                      onClick={() => handleAddAssociation(managingAssociations.id, association.id)}
                      className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                    >
                      <UserPlus size={16} className="text-blue-600" />
                      <span className="text-gray-800">{association.name}</span>
                    </button>
                  ))}
                </div>
                {associations.filter(assoc => !managingAssociations.memberships.some((m: any) => m.association_id === assoc.id)).length === 0 && (
                  <p className="text-gray-500 text-center py-4">User is already a member of all associations</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}