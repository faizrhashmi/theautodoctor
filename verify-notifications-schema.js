// Quick schema verification for notifications table
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifySchema() {
  try {
    // Test insert to confirm schema
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      type: 'session_completed',
      payload: { test: true }
    }

    // This will fail on FK but will show us column validation errors
    const { error } = await supabase
      .from('notifications')
      .insert(testData)
      .select()

    if (error) {
      console.log('Schema validation (expected FK error):', error.message)
    }

    // Check existing notifications to see structure
    const { data: existing } = await supabase
      .from('notifications')
      .select('*')
      .limit(1)

    if (existing && existing.length > 0) {
      console.log('\nExisting notification columns:', Object.keys(existing[0]))
      console.log('\nSample notification:', JSON.stringify(existing[0], null, 2))
    } else {
      console.log('\nNo existing notifications found')
    }

    // Verify allowed types from constraint
    console.log('\nAllowed notification types from migration:')
    console.log('- request_created')
    console.log('- request_accepted')
    console.log('- request_rejected')
    console.log('- session_started')
    console.log('- session_completed')
    console.log('- session_cancelled')
    console.log('- message_received')
    console.log('- payment_received')
    console.log('- quote_received')

  } catch (err) {
    console.error('Error:', err.message)
  }
}

verifySchema()
