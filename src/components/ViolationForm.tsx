import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Violation, ViolationFormData, ViolationStatus, Priority } from '../types/violation';
import AddressSelector from './AddressSelector';
import PhotoUpload from './PhotoUpload';

interface ViolationFormProps {
  onSubmit: (violation: ViolationFormData) => void;
  onCancel: () => void;
  initialData?: Violation;
  isEditing?: boolean;
  categories: Array<{ id: string; name: string; }>;
}

const statuses: ViolationStatus[] = ['Pending', 'In Progress', 'Resolved', 'Dismissed'];
const priorities: Priority[] = ['Low', 'Medium', 'High'];

export default function ViolationForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  isEditing = false,
  categories = []
}: ViolationFormProps) {
  const [formData, setFormData] = useState({
    address: initialData?.address || '',
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || '',
    status: initialData?.status || 'Pending' as ViolationStatus,
    dateReported: initialData?.dateReported || new Date().toISOString().split('T')[0],
    dateResolved: initialData?.dateResolved || '',
    reportedBy: initialData?.reportedBy || '',
    notes: initialData?.notes || '',
    priority: initialData?.priority || 'Medium' as Priority,
    photos: initialData?.photos || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoryId) {
      alert('Please select a violation category.');
      return;
    }

    onSubmit({
      ...formData,
      dateResolved: formData.dateResolved || undefined,
      notes: formData.notes || undefined,
      photos: formData.photos.length > 0 ? formData.photos : undefined,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAddressChange = (address: string) => {
    setFormData(prev => ({
      ...prev,
      address
    }));
  };

  const handlePhotosChange = (photos: string[]) => {
    setFormData(prev => ({
      ...prev,
      photos
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Edit Violation' : 'Add New Violation'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <AddressSelector
              value={formData.address}
              onChange={handleAddressChange}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reported By *
              </label>
              <input
                type="text"
                name="reportedBy"
                value={formData.reportedBy}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Violation Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the violation..."
            />
          </div>

          <PhotoUpload
            photos={formData.photos}
            onPhotosChange={handlePhotosChange}
            maxPhotos={5}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Reported
              </label>
              <input
                type="date"
                name="dateReported"
                value={formData.dateReported}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Resolved
              </label>
              <input
                type="date"
                name="dateResolved"
                value={formData.dateResolved}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes or comments..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus size={16} />
              <span>{isEditing ? 'Update' : 'Add'} Violation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}