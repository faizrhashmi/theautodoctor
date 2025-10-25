// API endpoint to create test users using Supabase Admin API
// This will create users with properly hashed passwords that work with signInWithPassword()

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You need the service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  const results = []

  // Test users to create
  const testUsers = [
    { email: 'admin@test.com', password: '1234', role: 'admin', name: 'Test Admin 1' },
    { email: 'admin1@test.com', password: '1234', role: 'admin', name: 'Test Admin 2' },
    { email: 'admin2@test.com', password: '1234', role: 'admin', name: 'Test Admin 3' },
    { email: 'cust@test.com', password: '1234', role: 'customer', name: 'Test Customer 1' },
    { email: 'cust1@test.com', password: '1234', role: 'customer', name: 'Test Customer 2' },
    { email: 'cust2@test.com', password: '1234', role: 'customer', name: 'Test Customer 3' },
  ]

  for (const user of testUsers) {
    try {
      // First, try to delete existing user
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === user.email)

      if (existingUser) {
        await supabaseAdmin.auth.admin.deleteUser(existingUser.id)
        results.push({ email: user.email, action: 'deleted_existing' })
      }

      // Create new user with proper password
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name,
          role: user.role
        },
        app_metadata: {
          role: user.role
        }
      })

      if (error) {
        results.push({ email: user.email, status: 'error', error: error.message })
      } else {
        results.push({ email: user.email, status: 'created', id: data.user?.id })

        // If it's a customer and customers table exists, add to customers table
        if (user.role === 'customer' && data.user) {
          try {
            await supabaseAdmin
              .from('customers')
              .upsert({
                id: data.user.id,
                email: user.email,
                full_name: user.name,
                created_at: new Date().toISOString()
              })
          } catch (err) {
            console.log('Could not add to customers table:', err)
          }
        }

        // Try to add to profiles table if it exists
        if (data.user) {
          try {
            await supabaseAdmin
              .from('profiles')
              .upsert({
                id: data.user.id,
                email: user.email,
                full_name: user.name
              })
          } catch (err) {
            console.log('Could not add to profiles table:', err)
          }
        }
      }
    } catch (error) {
      results.push({
        email: user.email,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return NextResponse.json({
    message: 'Test user creation complete',
    results,
    instructions: 'All users have password: 1234',
    loginEndpoints: {
      admin: '/admin/login',
      customer: '/signup?mode=login'
    }
  })
}