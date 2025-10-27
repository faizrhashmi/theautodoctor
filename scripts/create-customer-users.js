// Create test customer accounts
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PASSWORD = '12345678'

const CUSTOMERS = [
  {
    email: 'customer1@test.com',
    full_name: 'John Customer',
    phone: '+1-416-555-9001',
    city: 'Toronto',
    province: 'ON'
  },
  {
    email: 'customer2@test.com',
    full_name: 'Sarah Customer',
    phone: '+1-604-555-9002',
    city: 'Vancouver',
    province: 'BC'
  },
  {
    email: 'customer3@test.com',
    full_name: 'Mike Customer',
    phone: '+1-403-555-9003',
    city: 'Calgary',
    province: 'AB'
  }
]

async function createCustomers() {
  console.log('='.repeat(80))
  console.log('CREATING CUSTOMER ACCOUNTS')
  console.log('='.repeat(80))
  console.log()

  const results = {
    created: [],
    errors: []
  }

  for (const customer of CUSTOMERS) {
    try {
      console.log(`Processing: ${customer.full_name} (${customer.email})`)

      // Check if auth user already exists
      const { data: authData } = await supabase.auth.admin.listUsers()
      let authUser = authData?.users.find(u => u.email === customer.email)

      if (!authUser) {
        // Create new auth user
        const { data, error } = await supabase.auth.admin.createUser({
          email: customer.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: {
            full_name: customer.full_name,
            role: 'customer'
          }
        })

        if (error) throw error
        authUser = data.user
        console.log(`   ✅ Created auth user`)
      } else {
        console.log(`   ℹ️  Auth user exists (ID: ${authUser.id})`)

        // Update password to ensure we know it
        await supabase.auth.admin.updateUserById(authUser.id, {
          password: PASSWORD,
          email_confirm: true,
          user_metadata: {
            ...authUser.user_metadata,
            full_name: customer.full_name,
            role: 'customer'
          }
        })
        console.log(`   ✅ Updated auth user password`)
      }

      // Create/update profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: customer.email,
          full_name: customer.full_name,
          phone: customer.phone,
          role: 'customer',
          account_type: 'individual_customer',
          email_verified: true,
          city: customer.city,
          state_province: customer.province,
          country: 'Canada'
        }, { onConflict: 'id' })
        .select()
        .single()

      if (profileError) {
        console.error(`   ❌ Profile error: ${profileError.message}`)
        results.errors.push({ email: customer.email, error: profileError.message })
        continue
      }

      console.log(`   ✅ Created/updated profile`)
      console.log(`   📋 ID: ${authUser.id}`)
      console.log(`   📋 Location: ${customer.city}, ${customer.province}`)
      console.log()

      results.created.push({
        ...customer,
        id: authUser.id
      })

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`)
      results.errors.push({ email: customer.email, error: error.message })
      console.log()
    }
  }

  // SUMMARY
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log()
  console.log(`✅ Customers created: ${results.created.length}`)
  console.log(`❌ Errors: ${results.errors.length}`)

  if (results.created.length > 0) {
    console.log('\n' + '='.repeat(80))
    console.log('🔑 CUSTOMER LOGIN CREDENTIALS')
    console.log('='.repeat(80))

    results.created.forEach((customer, i) => {
      console.log(`\n${i + 1}. ${customer.full_name}`)
      console.log(`   Email:    ${customer.email}`)
      console.log(`   Password: ${PASSWORD}`)
      console.log(`   User ID:  ${customer.id}`)
      console.log(`   Location: ${customer.city}, ${customer.province}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log(`✅ Login URL: http://localhost:3000/customer/login`)
    console.log('   (Or use main signup/login flow)')
    console.log('='.repeat(80))
  }

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    results.errors.forEach(err => {
      console.log(`   - ${err.email}: ${err.error}`)
    })
  }

  console.log()

  // Return data for documentation
  return results
}

createCustomers().catch(console.error)
