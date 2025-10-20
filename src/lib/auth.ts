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

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(password: string, encoded: string) {
  if (!encoded) return false
  const [salt, storedHash] = encoded.split(':')
  if (!salt || !storedHash) return false

  const derived = scryptSync(password, salt, KEY_LENGTH)
  const expected = Buffer.from(storedHash, 'hex')

  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}

export function makeSessionToken(bytes = 32) {
  return randomBytes(bytes).toString('hex')
}
