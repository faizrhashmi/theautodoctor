#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnvFile(filename) {
  const filepath = resolve(process.cwd(), filename)
  if (!existsSync(filepath)) {
    return
  }

  const contents = readFileSync(filepath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const equalsIndex = line.indexOf('=')
    if (equalsIndex === -1) continue
    const key = line.slice(0, equalsIndex).trim()
    const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, '')
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
  console.error('[cleanupLegacyMechanicSessions] Missing Supabase env vars.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

async function run() {
  console.log('[cleanupLegacyMechanicSessions] Starting cleanup…')

  const { data: mechanics, error: mechanicsError } = await supabase.from('mechanics').select('id')

  if (mechanicsError) {
    console.error('[cleanupLegacyMechanicSessions] Failed to load mechanics:', mechanicsError)
    process.exit(1)
  }

  const mechanicIds = new Set(mechanics.map((m) => m.id))

  const { data: sessions, error: sessionsError } = await supabase
    .from('mechanic_sessions')
    .select('id, mechanic_id, created_at, expires_at')

  if (sessionsError) {
    console.error('[cleanupLegacyMechanicSessions] Failed to load mechanic sessions:', sessionsError)
    process.exit(1)
  }

  console.log(`[cleanupLegacyMechanicSessions] Loaded ${sessions.length} sessions`)

  const sessionsToDelete = sessions.filter((session) => !mechanicIds.has(session.mechanic_id))

  if (sessionsToDelete.length === 0) {
    console.log('[cleanupLegacyMechanicSessions] No legacy sessions detected. Done.')
    return
  }

  console.log(
    `[cleanupLegacyMechanicSessions] Found ${sessionsToDelete.length} sessions referencing unknown mechanics`
  )

  const batches = chunk(sessionsToDelete, 100)
  let deleted = 0

  for (const batch of batches) {
    const ids = batch.map((s) => s.id)
    const { error: deleteError } = await supabase.from('mechanic_sessions').delete().in('id', ids)
    if (deleteError) {
      console.error('[cleanupLegacyMechanicSessions] Failed to delete batch:', deleteError)
      process.exitCode = 1
      return
    }
    deleted += ids.length
    console.log(
      `[cleanupLegacyMechanicSessions] Deleted ${deleted}/${sessionsToDelete.length} legacy sessions…`
    )
  }

  console.log(`[cleanupLegacyMechanicSessions] Cleanup complete. Deleted ${deleted} legacy sessions.`)
}

run().catch((error) => {
  console.error('[cleanupLegacyMechanicSessions] Unexpected error:', error)
  process.exit(1)
})
