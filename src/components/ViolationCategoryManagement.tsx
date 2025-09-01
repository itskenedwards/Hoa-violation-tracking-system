import { useState } from 'react';
import { Tag, Plus, Edit, Trash2, X, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useViolationCategoryManagement } from '../hooks/useViolationCategoryManagement';
import { ViolationCategory } from '../hooks/useViolationCategories';

const DEFAULT_COLORS = [
  '#6B7280', '#EF4444', '#F97316', '#EAB308', '#22C55E', 
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E'
];

export default function ViolationCategoryManagement() {
  const { hasPermission } = useAuth();
  const { 
    categories, 
    loading, 
    error,
    createCategory, 
    updateCategory, 
    deleteCategory,
    reorderCategories
  } = useViolationCategoryManagement();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ViolationCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
  });

  if (!hasPermission('manage_violations') && !hasPermission('manage_company')) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <Tag size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p>You don't have permission to manage violation categories.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
        });
        setEditingCategory(null);
        alert('Category updated successfully!');
      } else {
        // Get the next sort order
        const maxSortOrder = Math.max(...categories.filter(c => !c.is_system_category).map(c => c.sort_order), -1);
        
        await createCategory({
          name: formData.name,
          description: formData.description || undefined,
          color: formData.color,
          sort_order: maxSortOrder + 1,
        });
        alert('Category created successfully!');
      }
      
      setShowForm(false);
      setFormData({ name: '', description: '', color: '#6B7280' });
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category: ' + (error as Error).message);
    }
  };

  const handleEdit = (category: ViolationCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await deleteCategory(categoryId);
        alert('Category deleted successfully!');
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category: ' + (error as Error).message);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#6B7280' });
  };

  const handleMoveUp = async (category: ViolationCategory) => {
    const customCategories = categories.filter(c => !c.is_system_category).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = customCategories.findIndex(c => c.id === category.id);
    
    if (currentIndex <= 0) return; // Already at top or not found
    
    const previousCategory = customCategories[currentIndex - 1];
    
    try {
      await reorderCategories([
        { id: category.id, sort_order: previousCategory.sort_order },
        { id: previousCategory.id, sort_order: category.sort_order },
      ]);
    } catch (error) {
      console.error('Error reordering categories:', error);
      alert('Failed to reorder categories: ' + (error as Error).message);
    }
  };

  const handleMoveDown = async (category: ViolationCategory) => {
    const customCategories = categories.filter(c => !c.is_system_category).sort((a, b) => a.sort_order - b.sort_order);
    const currentIndex = customCategories.findIndex(c => c.id === category.id);
    
    if (currentIndex >= customCategories.length - 1) return; // Already at bottom or not found
    
    const nextCategory = customCategories[currentIndex + 1];
    
    try {
      await reorderCategories([
        { id: category.id, sort_order: nextCategory.sort_order },
        { id: nextCategory.id, sort_order: category.sort_order },
      ]);
    } catch (error) {
      console.error('Error reordering categories:', error);
      alert('Failed to reorder categories: ' + (error as Error).message);
    }
  };

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const systemCategories = filteredCategories.filter(c => c.is_system_category);
  const customCategories = filteredCategories.filter(c => !c.is_system_category).sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading categories...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Tag className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Violation Categories</h2>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>Create Category</span>
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
                placeholder="Search categories by name or description..."
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

          {/* System Categories */}
          {systemCategories.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-800 mb-4">System Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemCategories.map(category => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: category.color }}
                        />
                        <h4 className="font-medium text-gray-800">{category.name}</h4>
                      </div>
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                        System
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-gray-600">{category.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Custom Categories</h3>
            
            {customCategories.length === 0 ? (
              <div className="text-center py-8">
                <Tag size={48} className="mx-auto text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No custom categories</h4>
                <p className="text-gray-600 mb-4">
                  {searchTerm 
                    ? "No categories match your search criteria."
                    : "Create your first custom violation category to get started."
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Create First Category</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customCategories.map((category, index) => (
                      <tr key={category.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm font-medium text-gray-900">{category.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {category.description || (
                              <span className="text-gray-400 italic">No description</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-6 h-6 rounded border border-gray-300"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-sm text-gray-600 font-mono">{category.color}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-gray-600">{category.sort_order}</span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleMoveUp(category)}
                                disabled={index === 0}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                onClick={() => handleMoveDown(category)}
                                disabled={index === customCategories.length - 1}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Edit category"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete category"
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
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Category Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Pool Area"
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
                  placeholder="Describe what violations fall under this category..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: formData.color }}
                    />
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="flex-1 px-3 py-1 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#6B7280"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-6 h-6 rounded border-2 transition-all ${
                          formData.color === color 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
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
                  <span>{editingCategory ? 'Update' : 'Create'} Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}