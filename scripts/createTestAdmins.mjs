#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filename) {
  const filepath = resolve(process.cwd(), filename)
  if (!existsSync(filepath)) return

  const contents = readFileSync(filepath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('[createTestAdmins] Missing Supabase environment variables.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const admins = [
  { email: 'admin@test.com', name: 'Test Admin 1' },
  { email: 'admin1@test.com', name: 'Test Admin 2' },
  { email: 'admin2@test.com', name: 'Test Admin 3' },
]

async function findUserByEmail(email) {
  let page = 1
  const perPage = 100

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`)
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (match) {
      return match
    }

    if (data.users.length < perPage) {
      break
    }
    page += 1
  }

  return null
}

async function upsertAdmin({ email, name }) {
  const desiredMetadata = { name, role: 'admin', is_admin: true }
  const desiredAppMetadata = { role: 'admin' }
  const password = process.env.TEST_ADMIN_PASSWORD || 'Admin1234!'

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: desiredMetadata,
    app_metadata: desiredAppMetadata,
  })
  if (createError) {
    if (createError.message?.includes('already registered')) {
      const existing = await findUserByEmail(email)
      if (!existing) {
        console.warn(`[createTestAdmins] ${email} already exists but could not be located via listUsers(). Skipping.`)
        return null
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: desiredMetadata,
        app_metadata: desiredAppMetadata,
      })
      if (updateError) {
        throw new Error(`Failed to update ${email}: ${updateError.message}`)
      }
      console.log(`[createTestAdmins] Updated admin ${email}`)
      return existing.id
    }
    throw new Error(`Failed to create ${email}: ${createError.message}`)
  }
  console.log(`[createTestAdmins] Created admin ${email}`)
  return created.user?.id
}

async function main() {
  console.log('[createTestAdmins] Ensuring seed admins exist…')
  for (const admin of admins) {
    try {
      await upsertAdmin(admin)
    } catch (error) {
      console.error(error.message)
      process.exitCode = 1
    }
  }
  console.log('[createTestAdmins] Done.')
}

main().catch((error) => {
  console.error('[createTestAdmins] Unexpected error:', error)
  process.exit(1)
})
