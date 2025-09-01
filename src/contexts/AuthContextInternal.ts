import { createContext } from 'react';
import { AuthUser } from '../types/auth';
import { Permission } from '../types/roles';

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  profileLoadError: string | null;
  debugInfo: string[];
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, associationId: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  refetchUser: () => Promise<void>;
  clearProfileLoadError: () => void;
  clearAuthState: () => Promise<boolean>;
  switchAssociation: (associationId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);