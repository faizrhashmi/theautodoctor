/**
 * Fix the get_active_session_for_customer function type mismatch
 * Run with: node scripts/fix-active-session-function.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const sql = `
CREATE OR REPLACE FUNCTION get_active_session_for_customer(p_customer_id UUID)
RETURNS TABLE (
  session_id UUID,
  session_status TEXT,
  session_type TEXT,
  created_at TIMESTAMPTZ
) AS $func$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.status::TEXT,
    s.type::TEXT,
    s.created_at
  FROM sessions s
  WHERE s.customer_user_id = p_customer_id
    AND s.status IN ('pending', 'waiting', 'live', 'scheduled')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
`

async function fix() {
  console.log('Fixing get_active_session_for_customer function...')

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // Try direct query instead
    console.log('Trying alternative method...')
    const { data: data2, error: error2 } = await supabase.from('_dummy').select().sql(sql)

    if (error2) {
      console.error('Failed to fix function:', error2)
      console.log('\nPlease run this SQL manually in Supabase Dashboard:')
      console.log(sql)
      process.exit(1)
    }
  }

  console.log('✓ Function fixed successfully!')
  console.log('The ActiveSessionBanner should now work correctly.')
}

fix()
