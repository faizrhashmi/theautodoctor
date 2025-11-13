import { z } from 'zod';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.qa from qa directory
config({ path: resolve(process.cwd(), '.env.qa') });

const envSchema = z.object({
  // Orchestrator settings
  QA_START_DEV: z.string().optional().transform(val => val === '1' || val === 'true'),
  QA_BASE_URL: z.string().url().default('http://localhost:3000'),
  QA_SLACK_WEBHOOK_URL: z.string().url().optional(),

  // Test credentials (optional - tests will skip if missing)
  QA_CUSTOMER_EMAIL: z.string().email().optional(),
  QA_CUSTOMER_PASSWORD: z.string().optional(),
  QA_MECHANIC_EMAIL: z.string().email().optional(),
  QA_MECHANIC_PASSWORD: z.string().optional(),
  QA_ADMIN_EMAIL: z.string().email().optional(),
  QA_ADMIN_PASSWORD: z.string().optional(),

  // External services (optional - tests will skip gracefully)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach(err => {
        console.error(`   ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid environment configuration');
  }
}

export function hasCredentials(userType: 'customer' | 'mechanic' | 'admin'): boolean {
  const env = getEnv();
  const emailKey = `QA_${userType.toUpperCase()}_EMAIL` as keyof Env;
  const passwordKey = `QA_${userType.toUpperCase()}_PASSWORD` as keyof Env;
  return !!(env[emailKey] && env[passwordKey]);
}

export function hasService(service: 'supabase' | 'stripe' | 'livekit'): boolean {
  const env = getEnv();

  switch (service) {
    case 'supabase':
      return !!(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
    case 'stripe':
      return !!env.STRIPE_SECRET_KEY;
    case 'livekit':
      return !!(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
    default:
      return false;
  }
}

export function getServiceStatus(): Record<string, boolean> {
  return {
    supabase: hasService('supabase'),
    stripe: hasService('stripe'),
    livekit: hasService('livekit'),
    customerCreds: hasCredentials('customer'),
    mechanicCreds: hasCredentials('mechanic'),
    adminCreds: hasCredentials('admin'),
  };
}
