import { useState } from 'react';
import { Edit, Trash2, Calendar, User, AlertCircle, Camera, MapPin } from 'lucide-react';
import { Violation } from '../types/violation';
import PhotoGallery from './PhotoGallery';

interface ViolationGridCardProps {
  violation: Violation;
  onEdit: (violation: Violation) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Resolved': 'bg-green-100 text-green-800',
  'Dismissed': 'bg-gray-100 text-gray-800',
};

const priorityColors = {
  'Low': 'text-green-600',
  'Medium': 'text-yellow-600',
  'High': 'text-red-600',
};

const categoryColors = {
  'Landscaping': 'bg-green-50 border-l-green-400',
  'Parking': 'bg-blue-50 border-l-blue-400',
  'Noise': 'bg-purple-50 border-l-purple-400',
  'Architectural': 'bg-orange-50 border-l-orange-400',
  'Pet': 'bg-pink-50 border-l-pink-400',
  'Trash/Recycling': 'bg-gray-50 border-l-gray-400',
  'Pool/Spa': 'bg-cyan-50 border-l-cyan-400',
  'Other': 'bg-slate-50 border-l-slate-400',
};

export default function ViolationGridCard({ violation, onEdit, onDelete }: ViolationGridCardProps) {
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoGallery(true);
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border-l-4 ${categoryColors[violation.category]} p-4 hover:shadow-md transition-shadow group`}>
        {/* Header with Actions */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-1">
              <MapPin size={14} className="text-gray-400 mr-1 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-gray-800 truncate">
                {violation.address}
              </h3>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[violation.status]}`}>
                {violation.status}
              </span>
              <div className={`flex items-center ${priorityColors[violation.priority]}`}>
                <AlertCircle size={12} className="mr-1" />
                <span className="text-xs font-medium">{violation.priority}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(violation)}
              className="text-blue-600 hover:text-blue-800 transition-colors p-1"
              title="Edit violation"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={() => onDelete(violation.id)}
              className="text-red-600 hover:text-red-800 transition-colors p-1"
              title="Delete violation"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {violation.description}
        </p>

        {/* Photos Preview */}
        {violation.photos && violation.photos.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center mb-2">
              <Camera size={12} className="text-gray-400 mr-1" />
              <span className="text-xs text-gray-500">
                {violation.photos.length} photo{violation.photos.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {violation.photos.slice(0, 3).map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Violation photo ${index + 1}`}
                    className="w-full h-12 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handlePhotoClick(index)}
                  />
                  {index === 2 && violation.photos!.length > 3 && (
                    <div 
                      className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center cursor-pointer"
                      onClick={() => handlePhotoClick(index)}
                    >
                      <span className="text-white text-xs font-medium">
                        +{violation.photos!.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Badge */}
        <div className="mb-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            {violation.category}
          </span>
        </div>

        {/* Footer Info */}
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">{formatDate(violation.dateReported)}</span>
          </div>
          <div className="flex items-center">
            <User size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">{violation.reportedBy}</span>
          </div>
        </div>

        {/* Notes Preview */}
        {violation.notes && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
            <span className="font-medium">Notes:</span> {violation.notes.substring(0, 80)}{violation.notes.length > 80 ? '...' : ''}
          </div>
        )}
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