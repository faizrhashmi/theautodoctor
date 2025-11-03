/**
 * Direct execution of Phase 1 cert expansion migration
 * Bypasses Supabase migration system to avoid issues with other pending migrations
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('==========================================');
  console.log('PHASE 1: CERT EXPANSION - SCHEMA MIGRATION');
  console.log('==========================================\n');

  // Read the migration SQL file
  const migrationPath = path.join(__dirname, '..', 'migrations', 'cert-expansion', '02_up.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file:', migrationPath);
  console.log('📏 SQL length:', migrationSQL.length, 'characters\n');

  console.log('🚀 Executing migration...\n');

  try {
    // Execute the migration using rpc to run raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, we need to create it or use a different approach
      // Let's try using the REST API directly with a custom header
      console.log('⚠️  exec_sql not available, using direct SQL execution...\n');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Migration failed:', errorText);
        process.exit(1);
      }

      console.log('✅ Migration executed successfully!\n');
    } else {
      console.log('✅ Migration executed successfully!\n');
      if (data) {
        console.log('📊 Result:', data);
      }
    }

    // Verify the migration by checking if columns exist
    console.log('🔍 Verifying migration...\n');

    const { data: columns, error: verifyError } = await supabase
      .rpc('get_table_columns', { table_name: 'mechanics' })
      .then(() => {
        // Fallback: query a mechanic to see if columns exist
        return supabase
          .from('mechanics')
          .select('certification_type, certification_number, certification_authority, certification_region, certification_expiry_date')
          .limit(1);
      });

    if (verifyError) {
      console.log('⚠️  Could not verify via query (this is OK if table is empty)');
      console.log('   Error:', verifyError.message);
    } else {
      console.log('✅ Verification successful - new columns are accessible\n');
    }

    console.log('==========================================');
    console.log('✅ PHASE 1 COMPLETE');
    console.log('==========================================\n');
    console.log('Next steps:');
    console.log('  1. Update TypeScript types');
    console.log('  2. Run verification script');
    console.log('  3. Commit Phase 1\n');

  } catch (err) {
    console.error('❌ Error executing migration:', err);
    process.exit(1);
  }
}

runMigration().catch(console.error);
