import { Search, Filter } from 'lucide-react';
import { ViolationFilters, ViolationCategory, ViolationStatus, Priority } from '../types/violation';

interface FilterBarProps {
  filters: ViolationFilters;
  onFiltersChange: (filters: ViolationFilters) => void;
  associations?: string[];
}

const categories: (ViolationCategory | 'All')[] = [
  'All', 'Landscaping', 'Parking', 'Noise', 'Architectural', 
  'Pet', 'Trash/Recycling', 'Pool/Spa', 'Other'
];

const statuses: (ViolationStatus | 'All')[] = ['All', 'Pending', 'In Progress', 'Resolved', 'Dismissed'];
const priorities: (Priority | 'All')[] = ['All', 'Low', 'Medium', 'High'];

export default function FilterBar({ filters, onFiltersChange, associations = [] }: FilterBarProps) {
  const handleFilterChange = (key: keyof ViolationFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-4">
        <Filter size={20} className="text-gray-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">Filter Violations</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search address, description..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Association
          </label>
          <select
            value={filters.association || 'All'}
            onChange={(e) => handleFilterChange('association', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="All">All Associations</option>
            {associations.map(association => (
              <option key={association} value={association}>{association}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {priorities.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}