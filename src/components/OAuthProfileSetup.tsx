import { useState, useEffect } from 'react';
import { Home, ChevronDown, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface Association {
  id: string;
  name: string;
}

interface OAuthProfileSetupProps {
  user: any;
  onComplete: () => void;
}

export default function OAuthProfileSetup({ user, onComplete }: OAuthProfileSetupProps) {
  const { refetchUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || '',
    lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
    associationId: '',
  });
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssociations, setLoadingAssociations] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAssociations();
  }, []);

  const loadAssociations = async () => {
    try {
      setLoadingAssociations(true);
      console.log('Loading available associations...');
      
      const { data, error } = await supabase
        .from('associations')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading associations:', error);
        setError('Failed to load available associations. Please try again.');
        return;
      }

      console.log('Associations loaded:', data);
      setAssociations(data || []);
    } catch (error) {
      console.error('Error loading associations:', error);
      setError('Failed to load available associations. Please try again.');
    } finally {
      setLoadingAssociations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.associationId) {
        setError('Please select an association to continue.');
        setLoading(false);
        return;
      }

      if (!formData.firstName.trim()) {
        setError('Please enter your first name.');
        setLoading(false);
        return;
      }

      console.log('Creating profile for OAuth user...');

      // Verify the association exists
      const { data: association, error: associationError } = await supabase
        .from('associations')
        .select('id, name')
        .eq('id', formData.associationId)
        .single();

      if (associationError || !association) {
        console.error('Association verification error:', associationError);
        setError('Selected association not found. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      console.log('Association verified:', association.name);

      // Update the user's display name in auth metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
          display_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim()
        }
      });

      if (updateError) {
        console.error('Error updating user metadata:', updateError);
        // Continue anyway - this is not critical
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          association_id: formData.associationId,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        if (profileError.message.includes('duplicate key')) {
          setError('A profile already exists for this account. Please contact support.');
        } else {
          setError('Failed to create user profile. Please try again.');
        }
        setLoading(false);
        return;
      }

      console.log('User profile created successfully');
      
      // Refresh user data to load the new profile
      await refetchUser();
      onComplete();
    } catch (error: any) {
      console.error('Unexpected error creating profile:', error);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center items-center space-x-4">
            <Home className="h-12 w-12 text-blue-600" />
            <h1 className="text-center text-2xl font-bold text-gray-900">
              Complete Your Profile
            </h1>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            Welcome! Please complete your profile to access the HOA Violations Tracker.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John"
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="associationId" className="block text-sm font-medium text-gray-700">
                Association *
              </label>
              <div className="mt-1 relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="associationId"
                  name="associationId"
                  required
                  value={formData.associationId}
                  onChange={handleChange}
                  disabled={loadingAssociations}
                  className="pl-10 pr-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="">
                    {loadingAssociations ? 'Loading associations...' : 'Select your association'}
                  </option>
                  {associations.map(association => (
                    <option key={association.id} value={association.id}>
                      {association.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {associations.length === 0 && !loadingAssociations && (
                <p className="mt-1 text-sm text-gray-600">
                  No associations available. Please contact your administrator to set up your association.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || loadingAssociations || associations.length === 0}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating profile...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}