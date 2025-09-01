import { useState } from 'react';
import { Edit, Trash2, Calendar, User, AlertCircle, Camera, MapPin, Eye, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Violation } from '../types/violation';
import PhotoGallery from './PhotoGallery';

interface ViolationTableProps {
  violations: Violation[];
  onView: (violation: Violation) => void;
  onEdit: (violation: Violation) => void;
  onDelete: (id: string) => void;
}

type SortColumn = 'address' | 'description' | 'category' | 'status' | 'priority' | 'dateReported' | 'reportedBy' | 'association';
type SortDirection = 'asc' | 'desc' | null;

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

export default function ViolationTable({ violations, onView, onEdit, onDelete }: ViolationTableProps) {
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>('dateReported');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const handlePhotoClick = (e: React.MouseEvent, photos: string[], index: number = 0) => {
    e.stopPropagation();
    setSelectedPhotos(photos);
    setSelectedPhotoIndex(index);
    setShowPhotoGallery(true);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn('dateReported'); // Default sort
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp size={14} className="text-blue-600" />;
    } else if (sortDirection === 'desc') {
      return <ChevronDown size={14} className="text-blue-600" />;
    }
    return <ArrowUpDown size={14} className="text-gray-400" />;
  };

  // Sort violations based on current sort settings
  const sortedViolations = [...violations].sort((a, b) => {
    if (!sortColumn || !sortDirection) {
      // Default sort by date reported (newest first)
      return new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime();
    }

    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'address':
        aValue = a.address.toLowerCase();
        bValue = b.address.toLowerCase();
        break;
      case 'description':
        aValue = a.description.toLowerCase();
        bValue = b.description.toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      case 'association':
        aValue = a.association.toLowerCase();
        bValue = b.association.toLowerCase();
        break;
      case 'status':
        const statusOrder = { 'Pending': 1, 'In Progress': 2, 'Resolved': 3, 'Dismissed': 4 };
        aValue = statusOrder[a.status];
        bValue = statusOrder[b.status];
        break;
      case 'priority':
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        aValue = priorityOrder[a.priority];
        bValue = priorityOrder[b.priority];
        break;
      case 'dateReported':
        aValue = new Date(a.dateReported).getTime();
        bValue = new Date(b.dateReported).getTime();
        break;
      case 'reportedBy':
        aValue = a.reportedBy.toLowerCase();
        bValue = b.reportedBy.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
    <th 
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {getSortIcon(column)}
      </div>
    </th>
  );

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader column="address">Address</SortableHeader>
                <SortableHeader column="description">Description</SortableHeader>
                <SortableHeader column="association">Association</SortableHeader>
                <SortableHeader column="category">Category</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <SortableHeader column="priority">Priority</SortableHeader>
                <SortableHeader column="dateReported">Reported</SortableHeader>
                <SortableHeader column="reportedBy">Reported By</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photos
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedViolations.map((violation, index) => (
                <tr 
                  key={violation.id} 
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                  onClick={() => onView(violation)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                      <div className="text-sm font-medium text-gray-900 max-w-xs">
                        {violation.address}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 max-w-xs">
                      <span title={violation.description}>
                        {truncateText(violation.description, 60)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {violation.association}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {violation.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[violation.status]}`}>
                      {violation.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`flex items-center ${priorityColors[violation.priority]}`}>
                      <AlertCircle size={12} className="mr-1" />
                      <span className="text-xs font-medium">{violation.priority}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar size={12} className="mr-1 text-gray-400" />
                      {formatDate(violation.dateReported)}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 max-w-xs">
                      <User size={12} className="mr-1 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{violation.reportedBy}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {violation.photos && violation.photos.length > 0 ? (
                      <button
                        onClick={(e) => handlePhotoClick(e, violation.photos!, 0)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Camera size={14} />
                        <span className="text-xs">{violation.photos.length}</span>
                        <Eye size={12} />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onEdit(violation)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Edit violation"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(violation.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete violation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {violations.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <AlertCircle size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No violations found</h3>
            <p className="text-gray-600">No violations match your current filters.</p>
          </div>
        )}
      </div>

      <PhotoGallery
        photos={selectedPhotos}
        isOpen={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
        initialIndex={selectedPhotoIndex}
      />
    </>
  );
}