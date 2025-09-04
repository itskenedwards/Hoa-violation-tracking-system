import { useState, useEffect, ChevronUp, ChevronDown} from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import AuthForm from './components/AuthForm';
import PasswordResetForm from './components/PasswordResetForm';
import UpdatePasswordForm from './components/UpdatePasswordForm';
import OAuthProfileSetup from './components/OAuthProfileSetup';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import FilterBar from './components/FilterBar';
import ViolationCard from './components/ViolationCard';
import ViolationTable from './components/ViolationTable';
import ViolationForm from './components/ViolationForm';
import ViolationDetailModal from './components/ViolationDetailModal';
import { ViolationFilters } from './types/violation';
import { useViolations } from './hooks/useViolations';
import { useViolationCategories } from './hooks/useViolationCategories';
import { filterViolations, sortViolations } from './utils/violationUtils';
import { supabase } from './lib/supabase';
import { Home, AlertCircle } from 'lucide-react';
import UserAccessTest from './components/UserAccessTest';

const initialFilters: ViolationFilters = {
  search: '',
  category: 'All',
  status: 'All',
  priority: 'All',
  association: 'All',
};

function AppContent() {
  const { user, loading, profileLoadError, clearAuthState, hasPermission } = useAuth();
  const { violations, loading: violationsLoading, addViolation, updateViolation, deleteViolation } = useViolations();
  const { categories } = useViolationCategories();
  const [filters, setFilters] = useState<ViolationFilters>(initialFilters);
  const [showForm, setShowForm] = useState(false);
  const [editingViolation, setEditingViolation] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);
  const [showOAuthSetup, setShowOAuthSetup] = useState(false);
  const [oauthUser, setOauthUser] = useState<any>(null);
  const [showAccessTest, setShowAccessTest] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table'); // Default to table
  const [viewingViolation, setViewingViolation] = useState<any>(null);

  // Check for password reset flow and OAuth users without profiles (only on mount)
  useEffect(() => {
    let hasRun = false;
    
    const checkAuthFlow = async () => {
      if (hasRun) return;
      hasRun = true;
      
      const urlParams = new URLSearchParams(window.location.search);
      const type = urlParams.get('type');
      
      if (type === 'recovery') {
        setShowUpdatePassword(true);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      // Only check for OAuth users if we have a user but no profile (avoid frequent checks)
      if (!loading && user && !user.profile) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('user_id', session.user.id)
              .single();

            if (!profile) {
              console.log('OAuth user without profile detected, showing setup form');
              setOauthUser(session.user);
              setShowOAuthSetup(true);
            }
          }
        } catch (error) {
          console.log('Error checking OAuth profile:', error);
        }
      }
    };

    checkAuthFlow();
  }, []); // Only run on mount

  const handleClearAuthAndReload = async () => {
    try {
      console.log('Clearing auth state from error screen...');
      
      await clearAuthState();
      window.location.href = window.location.origin;
    } catch (error) {
      console.error('Error clearing auth state:', error);
      window.location.href = window.location.origin;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              This should only take a few seconds...
            </p>
            <button
              onClick={handleClearAuthAndReload}
              className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Taking too long? Click here to restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (profileLoadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{profileLoadError}</p>
          
          <div className="space-y-3 text-center">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
              className="block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </a>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleClearAuthAndReload();
              }}
              className="block w-full text-orange-600 hover:text-orange-800 underline transition-colors"
            >
              Clear Data & Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showOAuthSetup && oauthUser) {
    return (
      <OAuthProfileSetup 
        user={oauthUser}
        onComplete={() => {
          setShowOAuthSetup(false);
          setOauthUser(null);
        }}
      />
    );
  }

  if (showUpdatePassword) {
    return (
      <UpdatePasswordForm 
        onComplete={() => {
          setShowUpdatePassword(false);
          setAuthMode('signin');
        }} 
      />
    );
  }

  if (showPasswordReset) {
    return (
      <PasswordResetForm 
        onBack={() => {
          setShowPasswordReset(false);
          setAuthMode('signin');
        }} 
      />
    );
  }

  if (showAccessTest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <button
              onClick={() => setShowAccessTest(false)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to App
            </button>
          </div>
          <UserAccessTest />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthForm 
        mode={authMode} 
        onModeChange={setAuthMode}
        onForgotPassword={() => setShowPasswordReset(true)}
        showDatabaseTestButton={true}
        onShowAccessTest={() => setShowAccessTest(true)}
      />
    );
  }

  const filteredViolations = sortViolations(filterViolations(violations, filters));
  const uniqueAssociations = Array.from(new Set(violations.map(v => v.association))).filter(Boolean) as string[];

  const handleAddViolation = async (violationData: any) => {
    try {
      await addViolation(violationData);
      setShowForm(false);
    } catch (error) {
      console.error('Error adding violation:', error);
    }
  };

  const handleEditViolation = async (violationData: any) => {
    if (!editingViolation) return;
    
    try {
      await updateViolation(editingViolation.id, violationData);
      setEditingViolation(null);
    } catch (error) {
      console.error('Error updating violation:', error);
    }
  };

  const handleDeleteViolation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this violation?')) {
      try {
        await deleteViolation(id);
      } catch (error) {
        console.error('Error deleting violation:', error);
      }
    }
  };

  const handleEditClick = (violation: any) => {
    setEditingViolation(violation);
  };

  const handleViewClick = (violation: any) => {
    setViewingViolation(violation);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingViolation(null);
    setViewingViolation(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onAddViolation={() => setShowForm(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard violations={violations} />
        
        <FilterBar 
          filters={filters} 
          onFiltersChange={setFilters}
          associations={uniqueAssociations}
        />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Violations ({filteredViolations.length})
          </h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          {violationsLoading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading violations...</p>
            </div>
          ) : filteredViolations.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Home size={48} className="mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No violations found</h3>
              <p className="text-gray-600 mb-6">
                {violations.length === 0 
                  ? "Get started by adding your first violation report."
                  : "Try adjusting your filters to see more results."
                }
              </p>
              {violations.length === 0 && (hasPermission('create_violations') || hasPermission('manage_violations')) && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                >
                  <span>Add First Violation</span>
                </button>
              )}
            </div>
          ) : (
            viewMode === 'table' ? (
              <ViolationTable
                violations={filteredViolations}
                onView={handleViewClick}
                onEdit={handleEditClick}
                onDelete={handleDeleteViolation}
              />
            ) : (
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {filteredViolations.map(violation => (
                  <ViolationCard
                    key={violation.id}
                    violation={violation}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteViolation}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {(showForm || editingViolation) && (
        <ViolationForm
          onSubmit={editingViolation ? handleEditViolation : handleAddViolation}
          onCancel={handleCancelForm}
          initialData={editingViolation || undefined}
          isEditing={!!editingViolation}
          categories={categories}
        />
      )}

      {viewingViolation && (
        <ViolationDetailModal
          violation={viewingViolation}
          onEdit={() => {
            setEditingViolation(viewingViolation);
            setViewingViolation(null);
          }}
          onDelete={() => {
            handleDeleteViolation(viewingViolation.id);
            setViewingViolation(null);
          }}
          onClose={() => setViewingViolation(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;