import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ViolationCategory } from '../hooks/useViolationCategories';

interface CreateCategoryData {
  name: string;
  description?: string;
  color: string;
  sort_order: number;
}

interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

export function useViolationCategoryManagement() {
  const { user, hasPermission } = useAuth();
  const [categories, setCategories] = useState<ViolationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && (hasPermission('manage_violations') || hasPermission('manage_company'))) {
      loadCategories();
    } else if (user) {
      setLoading(false);
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
        .or(`association_id.eq.${user.currentAssociation.id},is_system_category.eq.true`)
        .order('is_system_category', { ascending: false })
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

  const createCategory = async (categoryData: CreateCategoryData) => {
    if (!user || !(hasPermission('manage_violations') || hasPermission('manage_company'))) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { data, error } = await supabase
        .from('violation_categories')
        .insert({
          name: categoryData.name,
          description: categoryData.description || null,
          color: categoryData.color,
          sort_order: categoryData.sort_order,
          association_id: user.currentAssociation.id,
          is_system_category: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCategories(prev => [...prev, data].sort((a, b) => {
        if (a.is_system_category !== b.is_system_category) {
          return a.is_system_category ? -1 : 1;
        }
        return a.sort_order - b.sort_order;
      }));
      return data;
    } catch (err) {
      throw new Error('Failed to create category: ' + (err as Error).message);
    }
  };

  const updateCategory = async (categoryId: string, categoryData: UpdateCategoryData) => {
    if (!user || !(hasPermission('manage_violations') || hasPermission('manage_company'))) {
      throw new Error('Insufficient permissions');
    }

    try {
      const { data, error } = await supabase
        .from('violation_categories')
        .update({
          ...categoryData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId)
        .eq('is_system_category', false) // Only allow editing custom categories
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCategories(prev => prev.map(cat => cat.id === categoryId ? data : cat));
      return data;
    } catch (err) {
      throw new Error('Failed to update category: ' + (err as Error).message);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user || !(hasPermission('manage_violations') || hasPermission('manage_company'))) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('violation_categories')
        .update({ is_active: false })
        .eq('id', categoryId)
        .eq('is_system_category', false); // Only allow deleting custom categories

      if (error) {
        throw error;
      }

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    } catch (err) {
      throw new Error('Failed to delete category: ' + (err as Error).message);
    }
  };

  const reorderCategories = async (categoryUpdates: Array<{ id: string; sort_order: number }>) => {
    if (!user || !(hasPermission('manage_violations') || hasPermission('manage_company'))) {
      throw new Error('Insufficient permissions');
    }

    try {
      // Update sort orders for multiple categories
      const updates = categoryUpdates.map(update => 
        supabase
          .from('violation_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('is_system_category', false)
      );

      await Promise.all(updates);
      await loadCategories(); // Reload to get updated order
    } catch (err) {
      throw new Error('Failed to reorder categories: ' + (err as Error).message);
    }
  };

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    refetch: loadCategories,
  };
}