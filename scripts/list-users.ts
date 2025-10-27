// Script to list all users in Supabase
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function listAllUsers() {
  console.log('📋 Listing all users in Supabase...\n')

  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error listing users:', error)
    return
  }

  console.log(`Total users: ${users?.length || 0}\n`)

  users?.forEach((user, index) => {
    console.log(`${index + 1}. Email: ${user.email || 'NO EMAIL'}`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Created: ${user.created_at}`)
    console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`)
    console.log(`   Metadata: ${JSON.stringify(user.user_metadata, null, 2)}`)
    console.log('')
  })
}

listAllUsers()
