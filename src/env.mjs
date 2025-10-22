/**
 * Runtime Environment Variable Validation
 *
 * This file validates all required environment variables at build time and runtime.
 * Using Zod ensures type safety and fails fast if critical configuration is missing.
 *
 * SECURITY: This prevents the app from running with missing/invalid configuration
 * which could lead to runtime errors or security issues.
 */

import { z } from 'zod'

/**
 * Server-side environment variables (should never be exposed to the client)
 */
const serverSchema = z.object({
  // Stripe - Payment processing
  STRIPE_SECRET_KEY: z.string().min(1).startsWith('sk_', 'Stripe secret key must start with sk_'),
  STRIPE_PRICE_CHAT10: z.string().min(1).startsWith('price_', 'Stripe price ID must start with price_'),
  STRIPE_PRICE_VIDEO15: z.string().min(1).startsWith('price_', 'Stripe price ID must start with price_'),
  STRIPE_PRICE_DIAGNOSTIC: z.string().min(1).startsWith('price_', 'Stripe price ID must start with price_'),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).startsWith('whsec_', 'Stripe webhook secret must start with whsec_'),

  // LiveKit - Video/Audio infrastructure
  LIVEKIT_API_KEY: z.string().min(1, 'LiveKit API key is required'),
  LIVEKIT_API_SECRET: z.string().min(1, 'LiveKit API secret is required'),

  // Supabase - Database and auth
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // Optional server-side configs
  SUPABASE_STORAGE_BUCKET: z.string().optional().default('intakes'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

/**
 * Client-side environment variables (safe to expose, prefixed with NEXT_PUBLIC_)
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url('App URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URL must be a valid URL').startsWith('https://'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().startsWith('wss://', 'LiveKit URL must be a secure websocket URL'),

  // Optional client-side configs
  NEXT_PUBLIC_SUPABASE_USER_FILES_BUCKET: z.string().optional().default('user-files'),
  NEXT_PUBLIC_SUPPORT_CHAT_STATUS: z.string().optional(),
  NEXT_PUBLIC_SUPPORT_CHAT_TZ: z.string().optional().default('America/Toronto'),
})

/**
 * Validate and parse server environment variables
 */
const validateServerEnv = () => {
  const parsed = serverSchema.safeParse(process.env)

  if (!parsed.success) {
    console.error('❌ Invalid server environment variables:')
    console.error(JSON.stringify(parsed.error.format(), null, 2))
    throw new Error('Invalid server environment variables')
  }

  return parsed.data
}

/**
 * Validate and parse client environment variables
 */
const validateClientEnv = () => {
  // Only include NEXT_PUBLIC_ vars for client
  const clientEnv = Object.keys(process.env)
    .filter(key => key.startsWith('NEXT_PUBLIC_'))
    .reduce((acc, key) => {
      acc[key] = process.env[key]
      return acc
    }, {} as Record<string, string | undefined>)

  const parsed = clientSchema.safeParse(clientEnv)

  if (!parsed.success) {
    console.error('❌ Invalid client environment variables:')
    console.error(JSON.stringify(parsed.error.format(), null, 2))
    throw new Error('Invalid client environment variables')
  }

  return parsed.data
}

/**
 * Merged and validated environment object
 *
 * Server vars are only available on the server (Next.js API routes, getServerSideProps, etc.)
 * Client vars are available everywhere
 */
export const env = {
  server: typeof window === 'undefined' ? validateServerEnv() : ({} as z.infer<typeof serverSchema>),
  client: validateClientEnv(),
}

/**
 * Type-safe access to environment variables
 *
 * Usage:
 * import { env } from '@/env.mjs'
 *
 * // Server-side only
 * const stripeKey = env.server.STRIPE_SECRET_KEY
 *
 * // Available everywhere
 * const appUrl = env.client.NEXT_PUBLIC_APP_URL
 */

// Validate on module load to fail fast
if (typeof window === 'undefined') {
  validateServerEnv()
}
validateClientEnv()

console.log('✅ Environment variables validated successfully')
