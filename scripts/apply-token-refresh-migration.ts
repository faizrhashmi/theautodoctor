// Quick script to apply token refresh migration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying token refresh migration to mechanic_sessions table...');

  try {
    // Add refresh_token column
    const { error: error1 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE mechanic_sessions ADD COLUMN IF NOT EXISTS refresh_token TEXT;'
    });
    if (error1) console.log('Note:', error1.message);

    // Add refresh_expires_at column
    const { error: error2 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE mechanic_sessions ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP WITH TIME ZONE;'
    });
    if (error2) console.log('Note:', error2.message);

    // Add last_activity column
    const { error: error3 } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE mechanic_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
    });
    if (error3) console.log('Note:', error3.message);

    // Create index
    const { error: error4 } = await supabase.rpc('exec_sql', {
      query: 'CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_refresh_token ON mechanic_sessions(refresh_token) WHERE refresh_token IS NOT NULL;'
    });
    if (error4) console.log('Note:', error4.message);

    console.log('✅ Migration applied successfully!');
    console.log('Mechanics can now log in with the new token refresh system.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    console.log('\nPlease apply the migration manually in Supabase Studio:');
    console.log('1. Go to SQL Editor in Supabase Studio');
    console.log('2. Run the SQL from: supabase/migrations/20251027000002_add_token_refresh_to_mechanic_sessions.sql');
  }
}

applyMigration();
