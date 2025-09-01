import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Shield, User, Database, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface TestResult {
  name: string;
  status: 'running' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  duration?: number;
}

export default function UserAccessTest() {
  const { user, signIn, signOut } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testCredentials, setTestCredentials] = useState({
    email: '',
    password: ''
  });

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (name: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.name === name ? { ...r, ...updates } : r));
  };

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Database Connection
    const dbStart = performance.now();
    addResult({ name: 'Database Connection', status: 'running', message: 'Testing connection...' });
    
    try {
      const { error } = await supabase.auth.getSession();
      if (error) {
        updateResult('Database Connection', {
          status: 'error',
          message: 'Database connection failed',
          details: error.message,
          duration: performance.now() - dbStart
        });
      } else {
        updateResult('Database Connection', {
          status: 'success',
          message: 'Database connection successful',
          duration: performance.now() - dbStart
        });
      }
    } catch (error: any) {
      updateResult('Database Connection', {
        status: 'error',
        message: 'Database connection error',
        details: error.message,
        duration: performance.now() - dbStart
      });
    }

    // Test 2: Auth Service Health
    const authStart = performance.now();
    addResult({ name: 'Auth Service', status: 'running', message: 'Testing auth service...' });
    
    try {
      const { data, error } = await supabase.auth.getUser();
      updateResult('Auth Service', {
        status: error ? 'warning' : 'success',
        message: error ? 'Auth service has issues' : 'Auth service healthy',
        details: error?.message || (data.user ? `Current user: ${data.user.email}` : 'No current user'),
        duration: performance.now() - authStart
      });
    } catch (error: any) {
      updateResult('Auth Service', {
        status: 'error',
        message: 'Auth service error',
        details: error.message,
        duration: performance.now() - authStart
      });
    }

    // Test 3: Associations Table Access
    const assocStart = performance.now();
    addResult({ name: 'Associations Access', status: 'running', message: 'Testing associations table...' });
    
    try {
      const { data, error } = await supabase
        .from('associations')
        .select('id, name')
        .limit(5);
      
      updateResult('Associations Access', {
        status: error ? 'error' : 'success',
        message: error ? 'Cannot access associations table' : `Found ${data?.length || 0} associations`,
        details: error?.message || (data ? `First association: ${data[0]?.name || 'None'}` : 'No data returned'),
        duration: performance.now() - assocStart
      });
    } catch (error: any) {
      updateResult('Associations Access', {
        status: 'error',
        message: 'Associations table error',
        details: error.message,
        duration: performance.now() - assocStart
      });
    }

    // Test 4: User Profile Access (if signed in)
    if (user) {
      const profileStart = performance.now();
      addResult({ name: 'User Profile Access', status: 'running', message: 'Testing user profile access...' });
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        updateResult('User Profile Access', {
          status: error ? 'error' : 'success',
          message: error ? 'Cannot access user profile' : 'User profile accessible',
          details: error?.message || `Profile: ${data?.first_name} ${data?.last_name}`,
          duration: performance.now() - profileStart
        });
      } catch (error: any) {
        updateResult('User Profile Access', {
          status: 'error',
          message: 'User profile error',
          details: error.message,
          duration: performance.now() - profileStart
        });
      }

      // Test 5: User Memberships
      const memberStart = performance.now();
      addResult({ name: 'User Memberships', status: 'running', message: 'Testing user memberships...' });
      
      try {
        const { data, error } = await supabase
          .from('user_association_memberships')
          .select(`
            id,
            association_id,
            is_active,
            associations!inner (
              id,
              name
            )
          `)
          .eq('user_id', user.id);
        
        updateResult('User Memberships', {
          status: error ? 'error' : 'success',
          message: error ? 'Cannot access memberships' : `User has ${data?.length || 0} memberships`,
          details: error?.message || (data?.map(m => (m as any).associations.name).join(', ') || 'None'),
          duration: performance.now() - memberStart
        });
      } catch (error: any) {
        updateResult('User Memberships', {
          status: 'error',
          message: 'Memberships error',
          details: error.message,
          duration: performance.now() - memberStart
        });
      }

      // Test 6: User Roles
      const roleStart = performance.now();
      addResult({ name: 'User Roles', status: 'running', message: 'Testing user roles...' });
      
      try {
        const { data, error } = await supabase
          .from('user_role_assignments')
          .select(`
            role_id,
            roles!inner (
              id,
              name,
              permissions,
              is_system_role
            )
          `)
          .eq('user_id', user.id);
        
        updateResult('User Roles', {
          status: error ? 'error' : 'success',
          message: error ? 'Cannot access roles' : `User has ${data?.length || 0} roles`,
          details: error?.message || (data?.map(r => (r as any).roles.name).join(', ') || 'None'),
          duration: performance.now() - roleStart
        });
      } catch (error: any) {
        updateResult('User Roles', {
          status: 'error',
          message: 'Roles error',
          details: error.message,
          duration: performance.now() - roleStart
        });
      }

      // Test 7: Violations Access
      const violStart = performance.now();
      addResult({ name: 'Violations Access', status: 'running', message: 'Testing violations access...' });
      
      try {
        const { data, error } = await supabase
          .from('violations')
          .select('id, address, status')
          .limit(5);
        
        updateResult('Violations Access', {
          status: error ? 'error' : 'success',
          message: error ? 'Cannot access violations' : `Found ${data?.length || 0} violations`,
          details: error?.message || (data?.length ? `First violation: ${data[0]?.address}` : 'No violations'),
          duration: performance.now() - violStart
        });
      } catch (error: any) {
        updateResult('Violations Access', {
          status: 'error',
          message: 'Violations error',
          details: error.message,
          duration: performance.now() - violStart
        });
      }
    }

    setIsRunning(false);
  };

  const testSignIn = async () => {
    if (!testCredentials.email || !testCredentials.password) {
      addResult({
        name: 'Sign In Test',
        status: 'error',
        message: 'Please provide email and password'
      });
      return;
    }

    setIsRunning(true);
    const signInStart = performance.now();
    addResult({ name: 'Sign In Test', status: 'running', message: 'Attempting sign in...' });

    try {
      const result = await signIn(testCredentials.email, testCredentials.password);
      updateResult('Sign In Test', {
        status: result.error ? 'error' : 'success',
        message: result.error ? 'Sign in failed' : 'Sign in successful',
        details: result.error || 'User authenticated successfully',
        duration: performance.now() - signInStart
      });
    } catch (error: any) {
      updateResult('Sign In Test', {
        status: 'error',
        message: 'Sign in error',
        details: error.message,
        duration: performance.now() - signInStart
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">User Access Test Suite</h1>
        </div>

        {user ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-blue-800">
              <User className="h-5 w-5" />
              <span className="font-medium">Signed in as: {user.email}</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Current Association: {user.currentAssociation?.name || 'None'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">Sign In Test</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={testCredentials.email}
                  onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={testCredentials.password}
                  onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={testSignIn}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Test Sign In
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-4 mb-6">
          <button
            onClick={runComprehensiveTest}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            <span>Run Access Tests</span>
          </button>

          {user && (
            <button
              onClick={signOut}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Sign Out
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Test Results</h2>
            {results.map((result, index) => (
              <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-medium text-gray-800">{result.name}</h3>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </div>
                  {result.duration && (
                    <span className="text-xs text-gray-500">{result.duration.toFixed(0)}ms</span>
                  )}
                </div>
                {result.details && (
                  <div className="mt-2 text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2">
                    <strong>Details:</strong> {result.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}