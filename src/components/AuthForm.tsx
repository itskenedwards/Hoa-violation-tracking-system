import { useState, useEffect } from 'react';
import { Home, Mail, Lock, User, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import DatabaseTestButton from './DatabaseTestButton';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
  onForgotPassword: () => void;
  showDatabaseTestButton?: boolean;
  onShowAccessTest?: () => void;
}

interface Association {
  id: string;
  name: string;
  zip_code?: string;
}

export default function AuthForm({ mode, onModeChange, onForgotPassword, showDatabaseTestButton, onShowAccessTest }: AuthFormProps) {
  const { signIn, signUp, profileLoadError, clearProfileLoadError, debugInfo } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    associationId: '',
  });
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  // Load associations when switching to signup mode
  useEffect(() => {
    if (mode === 'signup') {
      loadAssociations();
    }
  }, [mode]);

  const loadAssociations = async () => {
    try {
      setLoadingAssociations(true);
      console.log('Loading available associations...');
      
      const { data, error } = await supabase
        .from('associations')
        .select('id, name, zip_code')
        .order('name');

      if (error) {
        console.error('Error loading associations:', error);
        setFormError('Failed to load available associations. Please try again.');
        return;
      }

      console.log('Associations loaded:', data);
      setAssociations(data || []);
    } catch (error) {
      console.error('Error loading associations:', error);
      setFormError('Failed to load available associations. Please try again.');
    } finally {
      setLoadingAssociations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    clearProfileLoadError();

    console.log('📝 FORM SUBMIT START');

    try {
      if (mode === 'signin') {
        console.log('📝 ATTEMPTING SIGNIN:', formData.email);
        const { error } = await signIn(formData.email, formData.password);
        console.log('📝 SIGNIN RESULT:', error ? 'ERROR' : 'SUCCESS');

        if (error) {
          console.error('Sign in error:', error);
          console.error('📝 SIGNIN ERROR:', error);
          setLoading(false);
        } else {
          console.log('📝 SIGNIN SUCCESS - auth context should handle loading');
          // Don't clear loading here - let auth context handle it
        }
      } else {
        console.log('📝 ATTEMPTING SIGNUP:', formData.email);
        
        // Validate association selection
        if (!formData.associationId) {
          setFormError('Please select an association to continue.');
          setLoading(false);
          return;
        }

        // Validate names
        if (!formData.firstName.trim()) {
          setFormError('Please enter your first name.');
          setLoading(false);
          return;
        }

        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.firstName.trim(),
          formData.lastName.trim(),
          formData.associationId
        );
        if (error) {
          console.error('📝 SIGNUP ERROR:', error);
          setFormError(error);
        } else {
          console.log('📝 SIGNUP SUCCESS');
          setFormError('Account created successfully! Please check your email to verify your account.');
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('📝 UNEXPECTED ERROR:', err);
      setFormError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Determine which error to display and format it appropriately
  const rawError = profileLoadError || formError;
  let displayError = rawError;
  let isSuccessMessage = formError.includes('successfully');
  let showSignInLink = false;

  // Handle "User already registered" error with better UX
  if (rawError && rawError.includes('User already registered')) {
    displayError = `An account with this email address already exists.`;
    showSignInLink = true;
    isSuccessMessage = false;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center items-center space-x-4">
            <Home className="h-64 w-64 text-blue-600" />
            <h1 className="text-center text-2xl font-bold text-gray-900">
              HOA Homeowner Violation Tracking System
            </h1>
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-gray-800">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => onModeChange('signup')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Register
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => onModeChange('signin')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === 'signup' && (
              <>
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
                          {association.name}{association.zip_code ? ` (${association.zip_code})` : ''}
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
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="pl-10 pr-10 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {mode === 'signin' && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {displayError && (
            <div className={`text-sm p-3 rounded-md ${
              isSuccessMessage 
                ? 'text-green-700 bg-green-50 border border-green-200' 
                : 'text-red-700 bg-red-50 border border-red-200'
            }`}>
              {displayError}
              {showSignInLink && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onModeChange('signin')}
                    className="font-medium text-blue-600 hover:text-blue-500 underline"
                  >
                    Sign in to your existing account instead
                  </button>
                </div>
              )}
              {profileLoadError && !showSignInLink && (
                <div className="mt-2 text-xs">
                  If you continue to experience issues, please try signing up again or contact support.
                </div>
              )}
            </div>
          )}

          {showDatabaseTestButton && (
            <div className="mt-4">
              <DatabaseTestButton />
              {onShowAccessTest && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={onShowAccessTest}
                    className="w-full text-center text-stone-50 hover:text-green-200 underline transition-colors text-sm"
                  >
                    Run User Access Test
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDebug(!showDebug)}
                    className="w-full text-center text-stone-50 hover:text-blue-200 underline transition-colors text-sm mt-1"
                  >
                    {showDebug ? 'Hide' : 'Show'} Debug Logs
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Visual Debug Panel */}
          {showDebug && (
            <div className="mt-4 bg-gray-50 border rounded-lg p-3">
              <h4 className="font-semibold text-gray-700 mb-2 text-sm">Debug Logs:</h4>
              <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.length > 0 ? (
                  debugInfo.map((log, index) => (
                    <div key={index} className="text-gray-600 font-mono break-all">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No debug info yet...</div>
                )}
              </div>
            </div>
          )}
          
          <div>
            <button
              type="submit"
              disabled={loading || (mode === 'signup' && (loadingAssociations || associations.length === 0))}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Register'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}