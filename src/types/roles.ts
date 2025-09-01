export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  is_system_role: boolean;
  association_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  roles?: Role;
}

export type Permission = 
  | 'manage_users'
  | 'manage_roles'
  | 'manage_violations'
  | 'view_violations'
  | 'create_violations'
  | 'manage_company'
  | 'view_reports'
  | 'manage_settings';

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'manage_users': 'Create, edit, and delete user accounts and assign roles',
  'manage_roles': 'Create, edit, and delete custom roles and permissions',
  'manage_violations': 'Create, edit, delete, and update violation records',
  'view_violations': 'View violation records and details',
  'create_violations': 'Create new violation reports',
  'manage_company': 'Edit association settings and information',
  'view_reports': 'Access reports and analytics',
  'manage_settings': 'Configure system settings and preferences',
};

export const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: ['manage_users', 'manage_roles', 'manage_violations', 'view_violations', 'manage_company', 'view_reports', 'manage_settings'] as Permission[],
  },
  {
    name: 'Association Admin',
    description: 'Full association access with user and violation management',
    permissions: ['manage_users', 'manage_violations', 'view_violations', 'manage_company', 'view_reports'] as Permission[],
  },
  {
    name: 'Manager',
    description: 'Can manage violations and view reports',
    permissions: ['manage_violations', 'view_violations', 'view_reports'] as Permission[],
  },
  {
    name: 'User',
    description: 'Basic user with violation viewing and reporting capabilities',
    permissions: ['view_violations', 'create_violations'] as Permission[],
  },
  {
    name: 'Viewer',
    description: 'Read-only access to violations',
    permissions: ['view_violations'] as Permission[],
  },
];