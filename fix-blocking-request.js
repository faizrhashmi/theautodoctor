const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local file
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1]] = match[2]
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

async function fixBlockingRequest() {
  console.log('🔧 Fixing blocking accepted request...\n')

  const requestId = '2a7227bb-4ab0-4984-9503-b32d7fe7234d'

  // Cancel the blocking request
  const { error } = await supabase
    .from('session_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log('✅ Successfully cancelled blocking request')
  console.log(`   Request ID: ${requestId}`)
  console.log('\n🎉 You should now be able to accept new requests!')
}

fixBlockingRequest()
  .catch(console.error)
  .finally(() => process.exit())
