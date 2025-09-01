import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export interface ViolationCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_system_category: boolean;
  is_active: boolean;
  sort_order: number;
}

export function useViolationCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ViolationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

  const loadCategories = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: categoriesError } = await supabase
        .from('violation_categories')
        .select('*')
        .eq('is_active', true)
        .or(`association_id.eq.${user.currentAssociation.id},is_system_category.eq.true`)
        .order('sort_order')
        .order('name');

      if (categoriesError) {
        throw categoriesError;
      }

      setCategories(data || []);
    } catch (err: any) {
      console.error('Error loading violation categories:', err);
      setError(err.message || 'Failed to load violation categories');
    } finally {
      setLoading(false);
    }
  };

  return {
    categories,
    loading,
    error,
    refetch: loadCategories
  };
}