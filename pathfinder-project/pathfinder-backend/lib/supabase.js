const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase URL or Key is not set. Supabase client will be a stub for local development.');

  // Export a minimal stub that throws clear errors when used.
  const stub = {
    from: () => { throw new Error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_KEY in .env'); },
    auth: {
      signInWithPassword: async () => { throw new Error('Supabase client not configured.'); },
      signUp: async () => { throw new Error('Supabase client not configured.'); },
    },
  };

  module.exports = stub;
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  module.exports = supabase;
}
