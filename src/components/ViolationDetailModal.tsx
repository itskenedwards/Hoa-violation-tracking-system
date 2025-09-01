import { useState } from 'react';
import { X, Edit, Trash2, Calendar, User, AlertCircle, Camera, MapPin, Eye } from 'lucide-react';
import { Violation } from '../types/violation';
import PhotoGallery from './PhotoGallery';

interface ViolationDetailModalProps {
  violation: Violation;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const statusColors = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Dismissed': 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  'Low': 'bg-green-100 text-green-800',
  'Medium': 'bg-yellow-100 text-yellow-800',
  'High': 'bg-red-100 text-red-800',
};

const categoryColors = {
  'Landscaping': 'bg-green-50 border-green-200',
  'Parking': 'bg-blue-50 border-blue-200',
  'Noise': 'bg-purple-50 border-purple-200',
  'Architectural': 'bg-orange-50 border-orange-200',
  'Pet': 'bg-pink-50 border-pink-200',
  'Trash/Recycling': 'bg-gray-50 border-gray-200',
  'Pool/Spa': 'bg-cyan-50 border-cyan-200',
  'Other': 'bg-slate-50 border-slate-200',
};

export default function ViolationDetailModal({ violation, onEdit, onDelete, onClose }: ViolationDetailModalProps) {
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoGallery(true);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this violation?')) {
      onDelete();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Violation Details</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Address and Basic Info */}
            <div className={`rounded-lg border-l-4 ${categoryColors[violation.category]} p-4`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {violation.address}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {violation.description}
              </p>
            </div>

            {/* Status and Priority Badges */}
            <div className="flex flex-wrap gap-3">
              <span className={`px-3 py-2 rounded-full text-sm font-medium ${statusColors[violation.status]}`}>
                {violation.status}
              </span>
              <span className={`px-3 py-2 rounded-full text-sm font-medium ${priorityColors[violation.priority]}`}>
                <AlertCircle size={16} className="inline mr-1" />
                {violation.priority} Priority
              </span>
              <span className="px-3 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                {violation.category}
              </span>
            </div>

            {/* Photos */}
            {violation.photos && violation.photos.length > 0 && (
              <div>
                <div className="flex items-center mb-3">
                  <Camera size={18} className="text-gray-500 mr-2" />
                  <h4 className="font-medium text-gray-800">
                    Photos ({violation.photos.length})
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {violation.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Violation photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handlePhotoClick(index)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                        <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Reporting Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-gray-400" />
                      <span className="text-gray-600">Reported:</span>
                      <span className="ml-2 font-medium">{formatDate(violation.dateReported)}</span>
                    </div>
                    <div className="flex items-center">
                      <User size={16} className="mr-2 text-gray-400" />
                      <span className="text-gray-600">Reported by:</span>
                      <span className="ml-2 font-medium">{violation.reportedBy}</span>
                    </div>
                    {violation.dateResolved && (
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-2 text-gray-400" />
                        <span className="text-gray-600">Resolved:</span>
                        <span className="ml-2 font-medium">{formatDate(violation.dateResolved)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Classification</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <span className="ml-2 font-medium">{violation.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium">{violation.status}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Priority:</span>
                      <span className="ml-2 font-medium">{violation.priority}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {violation.notes && (
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Additional Notes</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {violation.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit size={16} />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center space-x-2"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {violation.photos && (
        <PhotoGallery
          photos={violation.photos}
          isOpen={showPhotoGallery}
          onClose={() => setShowPhotoGallery(false)}
          initialIndex={selectedPhotoIndex}
        />
      )}
    </>
  );
}