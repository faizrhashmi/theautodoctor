const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('=== CERT EXPANSION - PHASE 1 MIGRATION ===\n');

  // Read migration SQL
  const upSQL = fs.readFileSync(
    path.join(__dirname, '../migrations/cert-expansion/02_up.sql'),
    'utf8'
  );

  console.log('📄 Migration SQL loaded (' + upSQL.length + ' bytes)\n');
  console.log('⚠️  About to run additive schema migration on Supabase...\n');
  console.log('This will add 5 new columns to the mechanics table:');
  console.log('  - certification_type');
  console.log('  - certification_number');
  console.log('  - certification_authority');
  console.log('  - certification_region');
  console.log('  - certification_expiry_date\n');

  try {
    // Execute migration via RPC (raw SQL execution)
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: upSQL
    });

    if (error) {
      // If exec_sql RPC doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, attempting direct execution...\n');

      // Parse and execute each statement separately
      const statements = upSQL
        .split('$$;')
        .filter(s => s.trim() && !s.trim().startsWith('--'))
        .map(s => s.trim() + (s.includes('$$') ? '$$;' : ''));

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.trim() === 'BEGIN;' || stmt.trim() === 'COMMIT;') {
          console.log('Skipping transaction statement: ' + stmt.trim());
          continue;
        }

        console.log('Executing statement ' + (i + 1) + '/' + statements.length + '...');

        try {
          // Try using the SQL editor via API
          const response = await fetch(supabaseUrl + '/rest/v1/rpc/exec_sql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': 'Bearer ' + supabaseKey
            },
            body: JSON.stringify({ sql_string: stmt })
          });

          if (!response.ok) {
            console.error('Statement failed:', stmt.substring(0, 100) + '...');
            console.error('Response:', await response.text());
          }
        } catch (err) {
          console.warn('Could not execute via API:', err.message);
        }
      }

      console.log('\n⚠️  MIGRATION REQUIRES MANUAL EXECUTION\n');
      console.log('Please run the SQL manually in Supabase SQL Editor:\n');
      console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('2. Copy contents of: migrations/cert-expansion/02_up.sql');
      console.log('3. Paste and run in SQL Editor');
      console.log('4. Then run verification: node scripts/verify-cert-migration.js\n');

      return;
    }

    console.log('✅ Migration executed successfully!\n');
    console.log('Result:', data);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

runMigration();
