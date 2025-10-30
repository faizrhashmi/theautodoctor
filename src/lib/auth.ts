// src/lib/auth.ts
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { getSupabaseServer } from './supabaseServer'

export async function ensureAdmin() {
  const supabase = getSupabaseServer()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { ok: false as const, status: 401, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Check role in profiles
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (pErr || !profile || profile.role !== 'admin') {
    return { ok: false as const, status: 403, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { ok: true as const, user }
}

const KEY_LENGTH = 64

/**
 * @deprecated This function is part of the old custom authentication system.
 * DO NOT USE in new code. All authentication now uses Supabase Auth.
 * This function is kept only for data migration purposes.
 *
 * Use: supabaseAdmin.auth.admin.createUser() instead
 */
export function hashPassword(password: string) {
  console.warn('[DEPRECATED] hashPassword() is deprecated. Use Supabase Auth instead.')
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${derived}`
}

/**
 * @deprecated This function is part of the old custom authentication system.
 * DO NOT USE in new code. All authentication now uses Supabase Auth.
 * This function is kept only for data migration purposes.
 *
 * Use: Supabase Auth handles password verification automatically
 */
export function verifyPassword(password: string, encoded: string) {
  console.warn('[DEPRECATED] verifyPassword() is deprecated. Use Supabase Auth instead.')
  if (!encoded) return false
  const [salt, storedHash] = encoded.split(':')
  if (!salt || !storedHash) return false

  const derived = scryptSync(password, salt, KEY_LENGTH)
  const expected = Buffer.from(storedHash, 'hex')

  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}

/**
 * @deprecated This function is part of the old custom authentication system.
 * DO NOT USE in new code. All authentication now uses Supabase Auth.
 * This function is kept only for data migration purposes.
 *
 * Use: Supabase Auth handles session tokens automatically via HTTP-only cookies
 */
export function makeSessionToken(bytes = 32) {
  console.warn('[DEPRECATED] makeSessionToken() is deprecated. Use Supabase Auth instead.')
  return randomBytes(bytes).toString('hex')
}
