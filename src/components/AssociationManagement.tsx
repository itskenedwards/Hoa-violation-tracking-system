import { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, X, MapPin, Phone, Mail, Globe, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Association } from '../types/auth';

export default function AssociationManagement() {
  const { user, hasPermission } = useAuth();
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
  });

  useEffect(() => {
    if (user && hasPermission('manage_company')) {
      loadAssociations();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const loadAssociations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('associations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) {
        throw fetchError;
      }

      setAssociations(data || []);
    } catch (err: any) {
      console.error('Error loading associations:', err);
      setError(err.message || 'Failed to load associations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingAssociation) {
        // Update existing association
        const { error: updateError } = await supabase
          .from('associations')
          .update({
            name: formData.name,
            abbreviation: formData.abbreviation || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zip_code || null,
            phone: formData.phone || null,
            email: formData.email || null,
            website: formData.website || null,
          })
          .eq('id', editingAssociation.id);

        if (updateError) {
          throw updateError;
        }

        alert('Association updated successfully!');
      } else {
        // Create new association
        const { error: insertError } = await supabase
          .from('associations')
          .insert({
            name: formData.name,
            abbreviation: formData.abbreviation || null,
            address: formData.address || null,
            city: formData.city || null,
            state: formData.state || null,
            zip_code: formData.zip_code || null,
            phone: formData.phone || null,
            email: formData.email || null,
            website: formData.website || null,
          });

        if (insertError) {
          throw insertError;
        }

        alert('Association created successfully!');
      }

      setShowForm(false);
      setEditingAssociation(null);
      setFormData({
        name: '',
        abbreviation: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        email: '',
        website: '',
      });
      await loadAssociations();
    } catch (err: any) {
      console.error('Error saving association:', err);
      setError(err.message || 'Failed to save association');
    }
  };

  const handleEdit = (association: Association) => {
    setEditingAssociation(association);
    setFormData({
      name: association.name,
      abbreviation: association.abbreviation || '',
      address: association.address || '',
      city: association.city || '',
      state: association.state || '',
      zip_code: association.zip_code || '',
      phone: association.phone || '',
      email: association.email || '',
      website: association.website || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (associationId: string) => {
    if (window.confirm('Are you sure you want to delete this association? This action cannot be undone.')) {
      try {
        const { error: deleteError } = await supabase
          .from('associations')
          .update({ is_active: false })
          .eq('id', associationId);

        if (deleteError) {
          throw deleteError;
        }

        await loadAssociations();
        alert('Association deleted successfully!');
      } catch (err: any) {
        console.error('Error deleting association:', err);
        setError(err.message || 'Failed to delete association');
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAssociation(null);
    setFormData({
      name: '',
      abbreviation: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      email: '',
      website: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Filter associations based on search term
  const filteredAssociations = associations.filter(association =>
    association.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (association.city && association.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (association.state && association.state.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!hasPermission('manage_company')) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <Building2 size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p>You don't have permission to manage associations.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading associations...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Association Management</h2>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Create Association</span>
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search associations by name, city, or state..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-6">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {/* Associations Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Association
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abbreviation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Abbreviation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
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
                {filteredAssociations.map(association => (
                  <tr key={association.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-8 w-8 text-blue-600 bg-blue-100 rounded-full p-1" />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {association.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {association.abbreviation || (
                          <span className="text-gray-400 italic">No abbreviation</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {association.address && (
                          <div className="flex items-center mb-1">
                            <MapPin size={12} className="mr-1 text-gray-400" />
                            {association.address}
                          </div>
                        )}
                        {(association.city || association.state || association.zip_code) && (
                          <div className="text-sm text-gray-500">
                            {[association.city, association.state, association.zip_code].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {!association.address && !association.city && !association.state && (
                          <span className="text-sm text-gray-400">No location info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 space-y-1">
                        {association.email && (
                          <div className="flex items-center">
                            <Mail size={12} className="mr-1 text-gray-400" />
                            <a href={`mailto:${association.email}`} className="text-blue-600 hover:text-blue-800">
                              {association.email}
                            </a>
                          </div>
                        )}
                        {association.phone && (
                          <div className="flex items-center">
                            <Phone size={12} className="mr-1 text-gray-400" />
                            <a href={`tel:${association.phone}`} className="text-blue-600 hover:text-blue-800">
                              {association.phone}
                            </a>
                          </div>
                        )}
                        {association.website && (
                          <div className="flex items-center">
                            <Globe size={12} className="mr-1 text-gray-400" />
                            <a href={association.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              Website
                            </a>
                          </div>
                        )}
                        {!association.email && !association.phone && !association.website && (
                          <span className="text-sm text-gray-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(association.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(association)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Edit association"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(association.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete association"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAssociations.length === 0 && (
            <div className="text-center py-8">
              <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No associations found</h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? "Try adjusting your search criteria."
                  : "Create your first association to get started."
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Association Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingAssociation ? 'Edit Association' : 'Create New Association'}
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
                  Association Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Oakwood Community HOA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assoc. Abbreviation *
                </label>
                <input
                  type="text"
                  name="abbreviation"
                  value={formData.abbreviation}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., OCHOA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Anytown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zip Code
                  </label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="90210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="info@oakwoodhoa.com"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <div className="relative">
                  <Globe size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://www.oakwoodhoa.com"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
                  {error}
                </div>
              )}

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
                  <span>{editingAssociation ? 'Update' : 'Create'} Association</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}