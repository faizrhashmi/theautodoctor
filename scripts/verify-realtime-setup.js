/**
 * Verify realtime setup for session_assignments table
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyRealtimeSetup() {
  console.log('🔍 Verifying realtime setup for session_assignments...\n')

  try {
    // Check if table is in publication
    const { data: pubTables, error: pubError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT schemaname, tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'session_assignments';
      `
    })

    if (pubError) {
      console.log('⚠️  Cannot query publication (try manual check in SQL editor):')
      console.log(`
        SELECT schemaname, tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'session_assignments';
      `)
    } else {
      console.log('📋 Publication check:', pubTables?.length > 0 ? '✅ In publication' : '❌ NOT in publication')
    }

    // Check replica identity
    const { data: replicaIdentity, error: riError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT relname, relreplident
        FROM pg_class
        WHERE relname = 'session_assignments';
      `
    })

    if (riError) {
      console.log('⚠️  Cannot query replica identity (try manual check)')
    } else {
      const identity = replicaIdentity?.[0]?.relreplident
      console.log('🔑 Replica identity:', identity === 'f' ? '✅ FULL' : `⚠️  ${identity} (should be 'f')`)
    }

    // Check RLS policies
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'session_assignments')

    console.log('\n🔒 RLS Policies:', policies?.length || 0)
    policies?.forEach(p => {
      console.log(`  - ${p.policyname} (${p.cmd})`)
    })

    // Check recent assignments
    const { data: assignments, error: assignError } = await supabase
      .from('session_assignments')
      .select('id, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('\n📊 Recent assignments:', assignments?.length || 0)
    assignments?.forEach(a => {
      console.log(`  - ${a.id} | ${a.status} | ${new Date(a.created_at).toLocaleTimeString()}`)
    })

    console.log('\n✅ Verification complete!')
    console.log('\nNext steps:')
    console.log('1. Restart your dev server completely (kill and restart)')
    console.log('2. Hard refresh browser (Ctrl+Shift+R)')
    console.log('3. Create a new session and watch console')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

verifyRealtimeSetup()
