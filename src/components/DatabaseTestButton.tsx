import { useState } from 'react';
import { Database, CheckCircle, XCircle, Clock } from 'lucide-react';
import { runDatabaseTest } from '../utils/testDatabaseCredentials';

export default function DatabaseTestButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  console.log('DatabaseTestButton render - isRunning:', isRunning, 'testResult exists:', !!testResult, 'showResult:', showResult);

  const handleRunTest = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRunning) return;
    
    console.log('handleRunTest called - starting test');
    setIsRunning(true);
    console.log('setIsRunning(true) called');
    setTestResult(null);
    setShowResult(false);
    console.log('State reset complete, calling runDatabaseTest...');

    try {
      const result = await runDatabaseTest();
      console.log('runDatabaseTest completed, result length:', result?.length || 0);
      console.log('Setting testResult and showResult...');
      setTestResult(result);
      setShowResult(true);
      console.log('testResult and showResult set');
    } catch (error) {
      console.error('Error in handleRunTest:', error);
      setTestResult(`Error: ${error}`);
      setShowResult(true);
    } finally {
      console.log('Setting isRunning to false');
      setIsRunning(false);
      console.log('handleRunTest complete');
    }
  };

  const getTestIcon = () => {
    if (isRunning) return <Clock className="h-4 w-4 animate-spin" />;
    if (!testResult) return <Database className="h-4 w-4" />;
    
    const successRate = testResult.includes('100.0%') ? 100 : 
                       testResult.includes('80.0%') || testResult.includes('60.0%') ? 80 : 0;
    
    if (successRate === 100) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (successRate >= 60) return <CheckCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getLinkStyle = () => {
    if (isRunning) return "text-blue-600";
    if (!testResult) return "text-stone-50 hover:text-stone-800";
    
    const successRate = testResult.includes('100.0%') ? 100 : 
                       testResult.includes('80.0%') || testResult.includes('60.0%') ? 80 : 0;
    
    if (successRate === 100) return "text-green-600 hover:text-green-800";
    if (successRate >= 60) return "text-yellow-600 hover:text-yellow-800";
    return "text-red-600 hover:text-red-800";
  };

  return (
    <div className="space-y-4 flex flex-col items-center">
      <a
        href="#"
        onClick={handleRunTest}
        className={`${getLinkStyle()} underline transition-colors inline-flex items-center space-x-2 text-sm ${
          isRunning ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {getTestIcon()}
        <span>
          {isRunning ? 'Testing Database...' : 'Test Database Credentials'}
        </span>
      </a>

      {showResult && testResult && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Database Test Results</span>
            </h3>
          </div>
          <div className="p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border overflow-x-auto">
              {testResult}
            </pre>
          </div>
          <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
            <p>
              This test checks your Supabase connection, credentials, and network latency.
              If you see failures, verify your .env file and network connection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}