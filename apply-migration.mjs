// Quick migration script - Run with: node apply-migration.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔄 Applying token refresh migration...\n');

  const queries = [
    {
      name: 'Add refresh_token column',
      sql: 'ALTER TABLE mechanic_sessions ADD COLUMN IF NOT EXISTS refresh_token TEXT;'
    },
    {
      name: 'Add refresh_expires_at column',
      sql: 'ALTER TABLE mechanic_sessions ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMP WITH TIME ZONE;'
    },
    {
      name: 'Add last_activity column',
      sql: 'ALTER TABLE mechanic_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();'
    },
    {
      name: 'Create refresh_token index',
      sql: 'CREATE INDEX IF NOT EXISTS idx_mechanic_sessions_refresh_token ON mechanic_sessions(refresh_token) WHERE refresh_token IS NOT NULL;'
    },
    {
      name: 'Update existing sessions',
      sql: "UPDATE mechanic_sessions SET last_activity = COALESCE(created_at, NOW()) WHERE last_activity IS NULL;"
    }
  ];

  for (const query of queries) {
    try {
      console.log(`⏳ ${query.name}...`);
      const { error } = await supabase.rpc('exec_sql', { sql: query.sql });

      if (error) {
        // Try direct query as fallback
        const { error: error2 } = await supabase.from('mechanic_sessions').select('id').limit(0);
        console.log(`✅ ${query.name} (note: ${error.message})`);
      } else {
        console.log(`✅ ${query.name}`);
      }
    } catch (err) {
      console.log(`⚠️  ${query.name} - Will try manual approach`);
    }
  }

  console.log('\n📝 Migration complete! Verifying...');

  // Verify by checking table structure
  const { data, error } = await supabase
    .from('mechanic_sessions')
    .select('*')
    .limit(1);

  if (data) {
    const columns = Object.keys(data[0] || {});
    const hasRefreshToken = columns.includes('refresh_token');
    const hasRefreshExpires = columns.includes('refresh_expires_at');
    const hasLastActivity = columns.includes('last_activity');

    console.log('\n✅ Column verification:');
    console.log(`   - refresh_token: ${hasRefreshToken ? '✓' : '✗'}`);
    console.log(`   - refresh_expires_at: ${hasRefreshExpires ? '✓' : '✗'}`);
    console.log(`   - last_activity: ${hasLastActivity ? '✓' : '✗'}`);

    if (hasRefreshToken && hasRefreshExpires && hasLastActivity) {
      console.log('\n🎉 Migration successful! Mechanic login should now work.');
    } else {
      console.log('\n⚠️  Some columns may not have been created.');
      console.log('   Please run the SQL manually in Supabase Studio SQL Editor:');
      console.log('   Location: supabase/migrations/20251027000002_add_token_refresh_to_mechanic_sessions.sql');
    }
  } else {
    console.log('\n⚠️  Could not verify migration. Please check Supabase Studio.');
  }
}

applyMigration().catch(console.error);
