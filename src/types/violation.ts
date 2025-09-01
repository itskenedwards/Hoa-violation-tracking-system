export interface Violation {
  id: string;
  address: string;
  description: string;
  categoryId: string;
  category: ViolationCategory;
  association: string;
  status: ViolationStatus;
  dateReported: string;
  dateResolved?: string;
  reportedBy: string;
  notes?: string;
  priority: Priority;
  photos?: string[];
}

export type ViolationCategory = 
  | 'Landscaping'
  | 'Parking'
  | 'Noise'
  | 'Architectural'
  | 'Pet'
  | 'Trash/Recycling'
  | 'Pool/Spa'
  | 'Other';

export type ViolationStatus = 
  | 'Pending'
  | 'In Progress'
  | 'Resolved'
  | 'Dismissed';

export type Priority = 'Low' | 'Medium' | 'High';

export interface ViolationFormData {
  address: string;
  description: string;
  categoryId: string;
  status: ViolationStatus;
  dateReported: string;
  dateResolved?: string;
  reportedBy: string;
  notes?: string;
  priority: Priority;
  photos?: string[];
}

export interface ViolationFilters {
  search: string;
  category: ViolationCategory | 'All';
  status: ViolationStatus | 'All';
  priority: Priority | 'All';
  association?: string;
}