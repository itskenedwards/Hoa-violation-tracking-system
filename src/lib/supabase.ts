import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a fetch wrapper with timeout functionality
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage for session persistence
    storage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
      removeItem: (key) => window.localStorage.removeItem(key),
    },
    storageKey: 'hoa-violations-auth',
    // Auto refresh token before expiration
    autoRefreshToken: true,
    // Persist session across browser restarts
    persistSession: true,
    // Detect session in URL (for password reset, etc.)
    detectSessionInUrl: true,
    // Use PKCE flow for better security
    flowType: 'pkce'
  },
  global: {
    fetch: fetchWithTimeout,
  },
});