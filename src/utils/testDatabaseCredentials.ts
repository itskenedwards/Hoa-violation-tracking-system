import { supabase } from '../lib/supabase';

export interface DatabaseTestResult {
  success: boolean;
  test: string;
  message: string;
  duration?: number;
  error?: string;
}

export async function testDatabaseCredentials(): Promise<DatabaseTestResult[]> {
  const results: DatabaseTestResult[] = [];
  
  console.log('🔍 Starting comprehensive database credentials test...');
  
  // Test 1: Basic environment variables
  console.log('Test 1: Checking environment variables...');
  const startTime1 = performance.now();
  
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      results.push({
        success: false,
        test: 'Environment Variables',
        message: 'Missing Supabase environment variables',
        duration: performance.now() - startTime1,
        error: `URL: ${supabaseUrl ? 'Present' : 'Missing'}, Key: ${supabaseKey ? 'Present' : 'Missing'}`
      });
      return results;
    }
    
    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      results.push({
        success: false,
        test: 'Environment Variables',
        message: 'Invalid Supabase URL format',
        duration: performance.now() - startTime1,
        error: `URL: ${supabaseUrl}`
      });
      return results;
    }
    
    results.push({
      success: true,
      test: 'Environment Variables',
      message: 'Environment variables are present and valid',
      duration: performance.now() - startTime1
    });
  } catch (error) {
    results.push({
      success: false,
      test: 'Environment Variables',
      message: 'Error checking environment variables',
      duration: performance.now() - startTime1,
      error: String(error)
    });
  }
  
  // Test 2: Basic connection test
  console.log('Test 2: Basic connection test...');
  const startTime2 = performance.now();
  
  try {
    // Test with a simple endpoint that doesn't require authentication
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    
    if (response.ok) {
      results.push({
        success: true,
        test: 'Basic Connection',
        message: 'Successfully connected to Supabase REST API',
        duration: performance.now() - startTime2
      });
    } else {
      results.push({
        success: false,
        test: 'Basic Connection',
        message: 'Failed to connect to Supabase REST API',
        duration: performance.now() - startTime2,
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }
  } catch (error) {
    results.push({
      success: false,
      test: 'Basic Connection',
      message: 'Network error connecting to Supabase',
      duration: performance.now() - startTime2,
      error: String(error)
    });
  }
  
  // Test 3: Auth endpoint test
  console.log('Test 3: Testing auth endpoint...');
  const startTime3 = performance.now();
  
  try {
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      results.push({
        success: false,
        test: 'Auth Endpoint',
        message: 'Auth endpoint returned an error',
        duration: performance.now() - startTime3,
        error: error.message
      });
    } else {
      results.push({
        success: true,
        test: 'Auth Endpoint',
        message: 'Auth endpoint is working correctly',
        duration: performance.now() - startTime3
      });
    }
  } catch (error) {
    results.push({
      success: false,
      test: 'Auth Endpoint',
      message: 'Error accessing auth endpoint',
      duration: performance.now() - startTime3,
      error: String(error)
    });
  }
  
  // Test 4: Database query test (public tables)
  console.log('Test 4: Testing database query...');
  const startTime4 = performance.now();
  
  try {
    // Try to query the associations table which should be publicly readable
    const { error } = await supabase
      .from('associations')
      .select('count')
      .limit(1);
    
    if (error) {
      results.push({
        success: false,
        test: 'Database Query',
        message: 'Database query failed',
        duration: performance.now() - startTime4,
        error: error.message
      });
    } else {
      results.push({
        success: true,
        test: 'Database Query',
        message: 'Successfully queried database',
        duration: performance.now() - startTime4
      });
    }
  } catch (error) {
    results.push({
      success: false,
      test: 'Database Query',
      message: 'Error executing database query',
      duration: performance.now() - startTime4,
      error: String(error)
    });
  }
  
  // Test 5: Network latency test
  console.log('Test 5: Testing network latency...');
  const startTime5 = performance.now();
  
  try {
    const latencyTests = [];
    
    for (let i = 0; i < 3; i++) {
      const pingStart = performance.now();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const pingEnd = performance.now();
      latencyTests.push(pingEnd - pingStart);
    }
    
    const avgLatency = latencyTests.reduce((sum, val) => sum + val, 0) / latencyTests.length;
    
    results.push({
      success: true,
      test: 'Network Latency',
      message: `Average latency: ${avgLatency.toFixed(2)}ms`,
      duration: performance.now() - startTime5
    });
  } catch (error) {
    results.push({
      success: false,
      test: 'Network Latency',
      message: 'Failed to measure network latency',
      duration: performance.now() - startTime5,
      error: String(error)
    });
  }
  
  // Summary
  const successfulTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log('\n📊 Database Credentials Test Results:');
  console.log(`Tests passed: ${successfulTests}/${totalTests}`);
  console.log(`Overall success rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration.toFixed(0)}ms)` : '';
    console.log(`${status} ${result.test}: ${result.message}${duration}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  return results;
}

// Helper function to run the test and display results in the UI
export async function runDatabaseTest(): Promise<string> {
  console.log('🚀 runDatabaseTest function started');
  try {
    const results = await testDatabaseCredentials();
    console.log('📊 testDatabaseCredentials completed, results count:', results.length);
    
    const successfulTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    let report = `Database Credentials Test Report\n`;
    report += `=====================================\n`;
    report += `Tests passed: ${successfulTests}/${totalTests}\n`;
    report += `Success rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%\n\n`;
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration.toFixed(0)}ms)` : '';
      report += `${status} ${result.test}: ${result.message}${duration}\n`;
      if (result.error) {
        report += `   Error: ${result.error}\n`;
      }
    });
    
    console.log('📝 Report generated, length:', report.length);
    console.log('✅ runDatabaseTest function completed successfully');
    return report;
  } catch (error) {
    console.error('❌ runDatabaseTest function failed:', error);
    return `Error running database test: ${error}`;
  }
}