import { Violation, ViolationFilters } from '../types/violation';

export function filterViolations(violations: Violation[], filters: ViolationFilters): Violation[] {
  return violations.filter(violation => {
    const matchesSearch = filters.search === '' || 
      violation.address.toLowerCase().includes(filters.search.toLowerCase()) ||
      violation.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      violation.reportedBy.toLowerCase().includes(filters.search.toLowerCase());

    const matchesCategory = filters.category === 'All' || violation.category === filters.category;
    const matchesStatus = filters.status === 'All' || violation.status === filters.status;
    const matchesPriority = filters.priority === 'All' || violation.priority === filters.priority;
    const matchesAssociation = !filters.association || filters.association === 'All' || violation.association === filters.association;

    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesAssociation;
  });
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function sortViolations(violations: Violation[]): Violation[] {
  return [...violations].sort((a, b) => {
    // Sort by priority first (High > Medium > Low)
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    
    // Then by date reported (newest first)
    return new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime();
  });
}