// Clean up orphaned admin profiles (profiles without auth users)
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// These are the orphaned profile IDs found in diagnosis
const ORPHANED_PROFILE_IDS = [
  'ae0e37d5-7000-4099-ab71-9eb1516ac042',
  '18ffff53-9088-4bd6-a300-e2cfa728592e',
  '2148acd8-9e33-4538-86b7-1938944fef20'
]

async function cleanupOrphanedProfiles() {
  console.log('='.repeat(80))
  console.log('🧹 CLEANING UP ORPHANED ADMIN PROFILES')
  console.log('='.repeat(80))
  console.log()
  console.log(`Found ${ORPHANED_PROFILE_IDS.length} orphaned profiles to remove\n`)

  for (const id of ORPHANED_PROFILE_IDS) {
    try {
      console.log(`Removing orphaned profile: ${id}`)

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      console.log(`   ✅ Deleted successfully\n`)

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`)
    }
  }

  // Verify cleanup
  console.log('='.repeat(80))
  console.log('✅ VERIFICATION')
  console.log('='.repeat(80))
  console.log()

  const { data: remainingAdmins, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'admin')

  if (error) {
    console.error(`❌ Error fetching admins: ${error.message}`)
  } else {
    console.log(`Total admin profiles now: ${remainingAdmins?.length || 0}\n`)

    remainingAdmins?.forEach((admin, i) => {
      console.log(`${i + 1}. ${admin.full_name || 'NO NAME'}`)
      console.log(`   Email: ${admin.email || 'NO EMAIL'}`)
      console.log(`   ID:    ${admin.id}`)
      console.log()
    })
  }

  console.log('✅ Cleanup complete!')
  console.log()
}

cleanupOrphanedProfiles().catch(console.error)
