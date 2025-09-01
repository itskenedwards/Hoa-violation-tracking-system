export interface Database {
  public: {
    Tables: {
      associations: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          association_id: string;
          first_name: string;
          last_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          association_id: string;
          first_name: string;
          last_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          association_id?: string;
          first_name?: string;
          last_name?: string;
          created_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          permissions: string[];
          is_system_role: boolean;
          association_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          permissions?: string[];
          is_system_role?: boolean;
          association_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          permissions?: string[];
          is_system_role?: boolean;
          association_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_role_assignments: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          assigned_by?: string | null;
          assigned_at?: string;
        };
      };
      user_association_memberships: {
        Row: {
          id: string;
          user_id: string;
          association_id: string;
          is_active: boolean;
          joined_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          association_id: string;
          is_active?: boolean;
          joined_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          association_id?: string;
          is_active?: boolean;
          joined_at?: string;
          created_at?: string;
        };
      };
      addresses: {
        Row: {
          id: string;
          association_id: string;
          street_address: string;
          unit_number: string | null;
          city: string;
          state: string;
          zip_code: string;
          property_type: string;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          association_id: string;
          street_address: string;
          unit_number?: string | null;
          city: string;
          state: string;
          zip_code: string;
          property_type?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          association_id?: string;
          street_address?: string;
          unit_number?: string | null;
          city?: string;
          state?: string;
          zip_code?: string;
          property_type?: string;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_user_permissions: {
        Args: {
          user_uuid: string;
        };
        Returns: string[];
      };
      user_has_permission: {
        Args: {
          user_uuid: string;
          permission_name: string;
        };
        Returns: boolean;
      };
      create_user_and_membership: {
        Args: {
          p_user_id: string;
          p_association_id: string;
          p_first_name: string;
          p_last_name: string;
        };
        Returns: {
          success: boolean;
          error?: string;
        };
      };
    };
  };
}