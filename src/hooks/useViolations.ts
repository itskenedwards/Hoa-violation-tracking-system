import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Violation, ViolationFormData } from '../types/violation';

export function useViolations() {
  const { user } = useAuth();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadViolations();
    }
  }, [user]);

  const loadViolations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('violations')
        .select(`
          *,
          violation_categories (
            id,
            name,
            color
          ),
          associations (
            id,
            name
          )
        `)
        .eq('association_id', user.currentAssociation.id)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      const formattedViolations: Violation[] = data.map(v => ({
        id: v.id,
        address: v.address,
        description: v.description,
        categoryId: v.category_id,
        category: (v.violation_categories as any)?.name || 'Other',
        association: (v.associations as any)?.name || 'Unknown Association',
        status: v.status as any,
        priority: v.priority as any,
        dateReported: v.date_reported,
        dateResolved: v.date_resolved || undefined,
        reportedBy: v.reported_by,
        notes: v.notes || undefined,
        photos: v.photos || undefined,
      }));

      setViolations(formattedViolations);
    } catch (err) {
      setError('Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  const addViolation = async (violationData: ViolationFormData) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('violations')
        .insert({
          association_id: user.currentAssociation.id,
          address: violationData.address,
          description: violationData.description,
          category_id: violationData.categoryId,
          status: violationData.status,
          priority: violationData.priority,
          date_reported: violationData.dateReported,
          date_resolved: violationData.dateResolved || null,
          reported_by: violationData.reportedBy,
          notes: violationData.notes || null,
          photos: violationData.photos || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newViolation: Violation = {
        id: data.id,
        association: data.association,
        address: data.address,
        description: data.description,
        categoryId: data.category_id,
        category: 'Other', // Will be updated when we reload
        status: data.status as any,
        priority: data.priority as any,
        dateReported: data.date_reported,
        dateResolved: data.date_resolved || undefined,
        reportedBy: data.reported_by,
        notes: data.notes || undefined,
        photos: data.photos || undefined,
      };

      setViolations(prev => [newViolation, ...prev]);
      // Reload to get the category name from the view
      loadViolations();
    } catch (err) {
      throw new Error('Failed to add violation');
    }
  };

  const updateViolation = async (id: string, violationData: ViolationFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('violations')
        .update({
          address: violationData.address,
          description: violationData.description,
          category_id: violationData.categoryId,
          status: violationData.status,
          priority: violationData.priority,
          date_reported: violationData.dateReported,
          date_resolved: violationData.dateResolved || null,
          reported_by: violationData.reportedBy,
          notes: violationData.notes || null,
          photos: violationData.photos || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('association_id', user.currentAssociation.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Reload to get the updated data with category name from the view
      loadViolations();
    } catch (err) {
      throw new Error('Failed to update violation');
    }
  };

  const deleteViolation = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('violations')
        .delete()
        .eq('id', id)
        .eq('association_id', user.currentAssociation.id);

      if (error) {
        throw error;
      }

      setViolations(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      throw new Error('Failed to delete violation');
    }
  };

  return {
    violations,
    loading,
    error,
    addViolation,
    updateViolation,
    deleteViolation,
    refetch: loadViolations,
  };
}