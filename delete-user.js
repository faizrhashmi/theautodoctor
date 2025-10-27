// delete-user.js
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config' // for environment variables

const supabaseAdmin = createClient(
NEXT_PUBLIC_SUPABASE_URL=https://qtkouemogsymqrzkysar.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0a291ZW1vZ3N5bXFyemt5c2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTgyOTUsImV4cCI6MjA3NjI5NDI5NX0.Q6n9qHk8NXe3GBMTpQN4VuxFtFqmuPvc-HTs2YmAHvw
)

async function deleteUserByEmail(email) {
  try {
    // List users to find the UUID
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error listing users:', error)
      return
    }
    
    // Find user by email
    const user = users.find(u => u.email === email)
    
    if (!user) {
      console.log('User not found')
      return
    }
    
    console.log(`Found user: ${user.email} with ID: ${user.id}`)
    
    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteError) {
      console.log('Delete error:', deleteError.message)
    } else {
      console.log('User deleted successfully!')
    }
    
  } catch (err) {
    console.error('Error:', err)
  }
}

// Run the function
deleteUserByEmail('customer2@test.com')