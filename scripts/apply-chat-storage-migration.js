/**
 * Script to apply chat-attachments storage bucket migration
 * This creates the storage bucket and RLS policies for file uploads in chat
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📦 Applying chat-attachments storage migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251127000000_chat_attachments_storage.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try alternative: use the REST API directly
      console.log('⚠️  exec_sql not available, trying direct execution...');

      // Execute using POST to pgmeta
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql: migrationSQL })
      });

      if (!response.ok) {
        throw new Error(`Failed to apply migration: ${response.statusText}`);
      }

      console.log('✅ Migration applied successfully!\n');
      console.log('📝 What was created:');
      console.log('   - Storage bucket: chat-attachments (public)');
      console.log('   - Policy: Authenticated users can upload chat attachments');
      console.log('   - Policy: Authenticated users can read chat attachments');
      console.log('   - Policy: Users can delete their chat attachments');
      console.log('   - Policy: Service role can manage all chat attachments');
      console.log('\n🎉 Users can now upload files in chat sessions!');
    } else {
      console.log('✅ Migration applied successfully!\n');
      console.log('📝 What was created:');
      console.log('   - Storage bucket: chat-attachments (public)');
      console.log('   - Policy: Authenticated users can upload chat attachments');
      console.log('   - Policy: Authenticated users can read chat attachments');
      console.log('   - Policy: Users can delete their chat attachments');
      console.log('   - Policy: Service role can manage all chat attachments');
      console.log('\n🎉 Users can now upload files in chat sessions!');
    }

  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
    console.log('\n📋 Manual steps to apply this migration:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy the contents of: supabase/migrations/20251127000000_chat_attachments_storage.sql');
    console.log('3. Paste and run the SQL in the editor');
    console.log('4. Verify the bucket exists in Storage → chat-attachments');
    process.exit(1);
  }
}

applyMigration();
