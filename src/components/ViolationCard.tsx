import { useState } from 'react';
import { Edit, Trash2, Calendar, User, AlertCircle, Camera } from 'lucide-react';
import { Violation } from '../types/violation';
import PhotoGallery from './PhotoGallery';

interface ViolationCardProps {
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

export default function ViolationCard({ violation, onEdit, onDelete }: ViolationCardProps) {
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setShowPhotoGallery(true);
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md border-l-4 ${categoryColors[violation.category]} p-6 hover:shadow-lg transition-shadow`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              {violation.address}
            </h3>
            <p className="text-gray-600 text-sm mb-2">{violation.description}</p>
          </div>
          <div className="flex space-x-2 ml-4">
            <button
              onClick={() => onEdit(violation)}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title="Edit violation"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={() => onDelete(violation.id)}
              className="text-red-600 hover:text-red-800 transition-colors"
              title="Delete violation"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {violation.photos && violation.photos.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Camera size={16} className="text-gray-500 mr-1" />
              <span className="text-sm text-gray-600">
                {violation.photos.length} photo{violation.photos.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {violation.photos.slice(0, 3).map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Violation photo ${index + 1}`}
                    className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handlePhotoClick(index)}
                  />
                  {index === 2 && violation.photos!.length > 3 && (
                    <div 
                      className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center cursor-pointer"
                      onClick={() => handlePhotoClick(index)}
                    >
                      <span className="text-white text-sm font-medium">
                        +{violation.photos!.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[violation.status]}`}>
            {violation.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[violation.priority]}`}>
            <AlertCircle size={12} className="inline mr-1" />
            {violation.priority}
          </span>
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {violation.category}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Calendar size={14} className="mr-1" />
            Reported: {formatDate(violation.dateReported)}
          </div>
          {violation.dateResolved && (
            <div className="flex items-center">
              <Calendar size={14} className="mr-1" />
              Resolved: {formatDate(violation.dateResolved)}
            </div>
          )}
          <div className="flex items-center">
            <User size={14} className="mr-1" />
            {violation.reportedBy}
          </div>
        </div>

        {violation.notes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Notes:</strong> {violation.notes}
            </p>
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