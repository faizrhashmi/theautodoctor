// Create test users for all roles
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Simple password hashing (use bcrypt in production)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

const TEST_USERS = {
  admins: [
    { email: 'admin1@askautodoctor.com', full_name: 'Admin One', password: 'Admin123!@#' },
    { email: 'admin2@askautodoctor.com', full_name: 'Admin Two', password: 'Admin123!@#' },
    { email: 'admin3@askautodoctor.com', full_name: 'Admin Three', password: 'Admin123!@#' }
  ],
  workshops: [
    {
      name: 'Premium Auto Care',
      email: 'contact@premiumauto.com',
      phone: '+1-416-555-0201',
      city: 'Toronto',
      province: 'ON',
      postal_code: 'M5V 3A8'
    },
    {
      name: 'Quick Fix Garage',
      email: 'info@quickfix.com',
      phone: '+1-604-555-0301',
      city: 'Vancouver',
      province: 'BC',
      postal_code: 'V6B 2W9'
    },
    {
      name: 'Expert Motors',
      email: 'service@expertmotors.com',
      phone: '+1-403-555-0401',
      city: 'Calgary',
      province: 'AB',
      postal_code: 'T2P 0Y3'
    }
  ],
  virtualMechanics: [
    {
      name: 'Sarah Johnson',
      email: 'sarah.mechanic@askautodoctor.com',
      password: 'Mechanic123!',
      phone: '+1-416-555-1001',
      specializations: ['Electrical Systems', 'Engine Diagnostics'],
      years_of_experience: 8
    },
    {
      name: 'Mike Chen',
      email: 'mike.mechanic@askautodoctor.com',
      password: 'Mechanic123!',
      phone: '+1-604-555-1002',
      specializations: ['Transmission', 'Brakes'],
      years_of_experience: 12
    },
    {
      name: 'Emily Rodriguez',
      email: 'emily.mechanic@askautodoctor.com',
      password: 'Mechanic123!',
      phone: '+1-403-555-1003',
      specializations: ['HVAC', 'Suspension'],
      years_of_experience: 6
    }
  ],
  workshopMechanics: [
    {
      name: 'David Smith',
      email: 'david.mechanic@askautodoctor.com',
      password: 'Mechanic123!',
      phone: '+1-416-555-2001',
      specializations: ['BMW', 'Mercedes-Benz'],
      years_of_experience: 15
    },
    {
      name: 'Lisa Wong',
      email: 'lisa.mechanic@askautodoctor.com',
      password: 'Mechanic123!',
      phone: '+1-604-555-2002',
      specializations: ['Toyota', 'Honda'],
      years_of_experience: 10
    },
    {
      name: 'James Taylor',
      email: 'james.mechanic@askautodoctor.com',
      password: 'Mechanic123!',
      phone: '+1-403-555-2003',
      specializations: ['Diesel', 'Heavy Duty'],
      years_of_experience: 20
    }
  ]
}

async function seedTestUsers() {
  console.log('='.repeat(80))
  console.log('SEEDING TEST USERS')
  console.log('='.repeat(80))
  console.log()

  const results = {
    admins: [],
    workshops: [],
    virtualMechanics: [],
    workshopMechanics: [],
    errors: []
  }

  // ============================================
  // 1. CREATE ADMIN USERS (in profiles table)
  // ============================================
  console.log('📋 Creating 3 Admin Users...')
  console.log('─'.repeat(80))

  for (const admin of TEST_USERS.admins) {
    try {
      // Create in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
        user_metadata: {
          full_name: admin.full_name,
          role: 'admin'
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          console.log(`⚠️  ${admin.email} - Already exists, skipping`)
          continue
        }
        throw authError
      }

      // Create/update profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.user.id,
          email: admin.email,
          full_name: admin.full_name,
          role: 'admin',
          account_type: 'admin',
          email_verified: true
        }, { onConflict: 'id' })
        .select()
        .single()

      if (profileError) throw profileError

      console.log(`✅ Created admin: ${admin.full_name} (${admin.email})`)
      console.log(`   ID: ${authUser.user.id}`)
      results.admins.push({ ...admin, id: authUser.user.id })

    } catch (error) {
      console.error(`❌ Error creating admin ${admin.email}:`, error.message)
      results.errors.push({ type: 'admin', email: admin.email, error: error.message })
    }
  }

  // ============================================
  // 2. CREATE WORKSHOP ORGANIZATIONS
  // ============================================
  console.log('\n\n🏢 Creating 3 Workshop Organizations...')
  console.log('─'.repeat(80))

  // Get first admin as creator
  const creatorId = results.admins[0]?.id || null

  for (const workshop of TEST_USERS.workshops) {
    try {
      const slug = workshop.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          organization_type: 'workshop',
          name: workshop.name,
          slug: slug,
          email: workshop.email,
          phone: workshop.phone,
          city: workshop.city,
          province: workshop.province,
          postal_code: workshop.postal_code,
          country: 'Canada',
          address: '123 Auto Street',
          industry: 'Automotive Repair',
          status: 'active',
          verification_status: 'verified',
          created_by: creatorId,
          approved_by: creatorId,
          approved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orgError) {
        if (orgError.message.includes('duplicate key')) {
          console.log(`⚠️  ${workshop.name} - Already exists, fetching existing...`)
          const { data: existing } = await supabase
            .from('organizations')
            .select('*')
            .eq('slug', slug)
            .single()

          if (existing) {
            results.workshops.push(existing)
            console.log(`✅ Using existing workshop: ${existing.name}`)
            console.log(`   ID: ${existing.id}`)
            continue
          }
        }
        throw orgError
      }

      console.log(`✅ Created workshop: ${org.name}`)
      console.log(`   ID: ${org.id}`)
      console.log(`   Email: ${org.email}`)
      results.workshops.push(org)

    } catch (error) {
      console.error(`❌ Error creating workshop ${workshop.name}:`, error.message)
      results.errors.push({ type: 'workshop', name: workshop.name, error: error.message })
    }
  }

  // ============================================
  // 3. CREATE VIRTUAL-ONLY MECHANICS
  // ============================================
  console.log('\n\n👨‍🔧 Creating 3 Virtual-Only Mechanics...')
  console.log('─'.repeat(80))

  for (const mechanic of TEST_USERS.virtualMechanics) {
    try {
      const { data: mechanicRecord, error: mechanicError } = await supabase
        .from('mechanics')
        .insert({
          email: mechanic.email,
          name: mechanic.name,
          phone: mechanic.phone,
          password_hash: hashPassword(mechanic.password),
          service_tier: 'virtual_only',
          account_type: 'individual_mechanic',
          workshop_id: null,
          can_perform_physical_work: false,
          prefers_virtual: true,
          prefers_physical: false,
          specializations: mechanic.specializations,
          years_of_experience: mechanic.years_of_experience,
          application_status: 'approved',
          is_available: true,
          can_accept_sessions: true,
          approved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (mechanicError) {
        if (mechanicError.message.includes('duplicate key')) {
          console.log(`⚠️  ${mechanic.email} - Already exists, skipping`)
          continue
        }
        throw mechanicError
      }

      console.log(`✅ Created virtual mechanic: ${mechanic.name}`)
      console.log(`   ID: ${mechanicRecord.id}`)
      console.log(`   Email: ${mechanic.email}`)
      console.log(`   Password: ${mechanic.password}`)
      console.log(`   Specializations: ${mechanic.specializations.join(', ')}`)
      results.virtualMechanics.push({ ...mechanic, id: mechanicRecord.id })

    } catch (error) {
      console.error(`❌ Error creating virtual mechanic ${mechanic.email}:`, error.message)
      results.errors.push({ type: 'virtual_mechanic', email: mechanic.email, error: error.message })
    }
  }

  // ============================================
  // 4. CREATE WORKSHOP-AFFILIATED MECHANICS
  // ============================================
  console.log('\n\n🏢👨‍🔧 Creating 3 Workshop-Affiliated Mechanics...')
  console.log('─'.repeat(80))

  if (results.workshops.length === 0) {
    console.log('⚠️  No workshops available, skipping workshop mechanics')
  } else {
    for (let i = 0; i < TEST_USERS.workshopMechanics.length; i++) {
      const mechanic = TEST_USERS.workshopMechanics[i]
      const workshop = results.workshops[i % results.workshops.length] // Distribute across workshops

      try {
        const { data: mechanicRecord, error: mechanicError } = await supabase
          .from('mechanics')
          .insert({
            email: mechanic.email,
            name: mechanic.name,
            phone: mechanic.phone,
            password_hash: hashPassword(mechanic.password),
            service_tier: 'workshop_partner',
            account_type: 'individual_mechanic',
            workshop_id: workshop.id,
            can_perform_physical_work: true,
            prefers_virtual: false,
            prefers_physical: true,
            partnership_type: 'employee',
            specializations: mechanic.specializations,
            years_of_experience: mechanic.years_of_experience,
            application_status: 'approved',
            is_available: true,
            can_accept_sessions: true,
            approved_at: new Date().toISOString()
          })
          .select()
          .single()

        if (mechanicError) {
          if (mechanicError.message.includes('duplicate key')) {
            console.log(`⚠️  ${mechanic.email} - Already exists, skipping`)
            continue
          }
          throw mechanicError
        }

        console.log(`✅ Created workshop mechanic: ${mechanic.name}`)
        console.log(`   ID: ${mechanicRecord.id}`)
        console.log(`   Email: ${mechanic.email}`)
        console.log(`   Password: ${mechanic.password}`)
        console.log(`   Workshop: ${workshop.name}`)
        console.log(`   Specializations: ${mechanic.specializations.join(', ')}`)
        results.workshopMechanics.push({ ...mechanic, id: mechanicRecord.id, workshop })

      } catch (error) {
        console.error(`❌ Error creating workshop mechanic ${mechanic.email}:`, error.message)
        results.errors.push({ type: 'workshop_mechanic', email: mechanic.email, error: error.message })
      }
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n' + '='.repeat(80))
  console.log('SEEDING COMPLETE')
  console.log('='.repeat(80))
  console.log()
  console.log(`✅ Admins created: ${results.admins.length}`)
  console.log(`✅ Workshops created: ${results.workshops.length}`)
  console.log(`✅ Virtual-only mechanics created: ${results.virtualMechanics.length}`)
  console.log(`✅ Workshop-affiliated mechanics created: ${results.workshopMechanics.length}`)
  console.log(`❌ Errors: ${results.errors.length}`)

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:')
    results.errors.forEach(err => {
      console.log(`   - ${err.type}: ${err.email || err.name} - ${err.error}`)
    })
  }

  // ============================================
  // LOGIN CREDENTIALS
  // ============================================
  console.log('\n\n' + '='.repeat(80))
  console.log('LOGIN CREDENTIALS')
  console.log('='.repeat(80))

  console.log('\n👑 ADMIN USERS (login at /admin/login):')
  TEST_USERS.admins.forEach((admin, i) => {
    console.log(`\n${i + 1}. ${admin.full_name}`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${admin.password}`)
  })

  console.log('\n\n👨‍🔧 VIRTUAL-ONLY MECHANICS (login at /mechanic/login):')
  TEST_USERS.virtualMechanics.forEach((mech, i) => {
    console.log(`\n${i + 1}. ${mech.name}`)
    console.log(`   Email: ${mech.email}`)
    console.log(`   Password: ${mech.password}`)
    console.log(`   Type: Independent Virtual`)
  })

  console.log('\n\n🏢 WORKSHOP-AFFILIATED MECHANICS (login at /mechanic/login):')
  TEST_USERS.workshopMechanics.forEach((mech, i) => {
    const workshop = results.workshops[i % results.workshops.length]
    console.log(`\n${i + 1}. ${mech.name}`)
    console.log(`   Email: ${mech.email}`)
    console.log(`   Password: ${mech.password}`)
    console.log(`   Workshop: ${workshop?.name || 'N/A'}`)
  })

  console.log('\n\n' + '='.repeat(80))
  console.log('✅ All test users created successfully!')
  console.log('='.repeat(80))
  console.log()
}

seedTestUsers().catch(console.error)
