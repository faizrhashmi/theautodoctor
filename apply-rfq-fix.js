/**
 * Apply RFQ Organization Members Fix
 *
 * Directly executes the SQL to fix infinite recursion error
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFix() {
  console.log('\n============================================');
  console.log('Applying RFQ Organization Members Fix');
  console.log('============================================\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'FIX_ORGANIZATION_MEMBERS_COMPLETE.sql');
  let sqlContent;

  try {
    sqlContent = fs.readFileSync(sqlPath, 'utf8');
  } catch (err) {
    console.error('❌ Could not read FIX_ORGANIZATION_MEMBERS_COMPLETE.sql');
    console.error('   Error:', err.message);
    process.exit(1);
  }

  console.log('📄 SQL file loaded successfully');
  console.log('📝 File size:', sqlContent.length, 'bytes\n');

  // Split SQL into individual statements (basic split by semicolon)
  // This is a simplified approach - for production, use a proper SQL parser
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s !== '$$');

  console.log('🔧 Executing', statements.length, 'SQL statements...\n');

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty statements
    if (statement.startsWith('--') || statement.length === 0) {
      continue;
    }

    // Skip DO blocks (they need special handling)
    if (statement.trim().startsWith('DO $$')) {
      console.log(`⏩ Skipping verification DO block (${i + 1}/${statements.length})`);
      continue;
    }

    console.log(`▶️  Executing statement ${i + 1}/${statements.length}...`);

    try {
      // Execute the statement
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });

      if (error) {
        // Try direct query execution if RPC fails
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: statement + ';' })
        });

        if (!response.ok) {
          // This is expected - Supabase doesn't expose exec_sql by default
          // We need to use a different approach
          console.log('⚠️  Cannot execute via API, will need manual execution\n');
          break;
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    } catch (err) {
      console.log(`⚠️  API execution not available: ${err.message}\n`);
      break;
    }
  }

  console.log('\n============================================');
  console.log('⚠️  MANUAL EXECUTION REQUIRED');
  console.log('============================================\n');
  console.log('The Supabase API does not support direct SQL execution.');
  console.log('You need to run the SQL manually:\n');
  console.log('Option 1: Supabase Dashboard (Recommended)');
  console.log('  1. Go to https://supabase.com/dashboard');
  console.log('  2. Select your project');
  console.log('  3. Click "SQL Editor"');
  console.log('  4. Copy the entire contents of FIX_ORGANIZATION_MEMBERS_COMPLETE.sql');
  console.log('  5. Paste into the SQL Editor');
  console.log('  6. Click "Run"\n');
  console.log('Option 2: Migration File');
  console.log('  1. Copy FIX_ORGANIZATION_MEMBERS_COMPLETE.sql to');
  console.log('     supabase/migrations/99999999999999_fix_org_members_complete.sql');
  console.log('  2. Run: npx supabase db push\n');
  console.log('After running, execute: node verify-rfq-fix.js');
  console.log('============================================\n');
}

applyFix().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
