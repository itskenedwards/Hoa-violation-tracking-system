import { Role, Permission } from './roles';

export interface UserProfile {
  id: string;
  user_id: string;
  association_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AssociationMembership {
  id: string;
  user_id: string;
  association_id: string;
  is_active: boolean;
  joined_at: string;
  created_at: string;
}

export interface Association {
  id: string;
  name: string;
  abbreviation?: string;
  created_at: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile;
  associations: Association[];
  currentAssociation: Association;
  memberships: AssociationMembership[];
  roles: Role[];
  permissions: Permission[];
}