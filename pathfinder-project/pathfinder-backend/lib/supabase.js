const { createClient } = require('@supabase/supabase-js');

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase URL or Key is not set. Supabase client will be a stub.');

  const stub = {
    from: () => { throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in .env'); },
    auth: {
      signInWithPassword: async () => { throw new Error('Supabase not configured.'); },
      signUp: async () => { throw new Error('Supabase not configured.'); },
      updateUser: async () => { throw new Error('Supabase not configured.'); },
    },
  };
  module.exports = stub;

} else {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('✅ Supabase client initialized:', supabaseUrl.split('.')[0].replace('https://', ''));
  module.exports = supabase;
}
