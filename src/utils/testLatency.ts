import { supabase } from '../lib/supabase';

export async function testDatabaseLatency() {
  const results = [];
  
  console.log('🔍 Testing database connection latency...');
  
  for (let i = 1; i <= 5; i++) {
    const startTime = performance.now();
    
    try {
      const { error } = await supabase
        .from('associations')
        .select('count')
        .limit(1);
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      console.log(`Test ${i}: ${latency.toFixed(2)}ms`);
      results.push({
        test: i,
        latency: latency,
        success: !error,
        error: error?.message
      });
      
    } catch (err) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      console.log(`Test ${i}: FAILED after ${latency.toFixed(2)}ms - ${err}`);
      results.push({
        test: i,
        latency: latency,
        success: false,
        error: String(err)
      });
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successfulTests = results.filter(r => r.success);
  const avgLatency = successfulTests.length > 0 
    ? successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length
    : null;
  
  console.log('\n📊 Latency Test Results:');
  console.log(`Successful tests: ${successfulTests.length}/5`);
  if (avgLatency) {
    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Min latency: ${Math.min(...successfulTests.map(r => r.latency)).toFixed(2)}ms`);
    console.log(`Max latency: ${Math.max(...successfulTests.map(r => r.latency)).toFixed(2)}ms`);
  }
  
  return {
    results,
    averageLatency: avgLatency,
    successRate: (successfulTests.length / results.length) * 100
  };
}