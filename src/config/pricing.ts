/**
 * @deprecated This file is being phased out in favor of the database-driven service_plans system.
 * New plans should be managed through the Admin UI at /admin/plans
 *
 * This config is kept for backward compatibility and fallback purposes.
 * Use the /api/plans endpoint and useServicePlans hook for new implementations.
 */

// Extensible for future tiers (video30, video60, chat20, chat30, etc.)
export type PlanKey = 'chat10' | 'video15' | 'diagnostic' | string;

export const PLAN_ALIASES: Record<string, PlanKey> = {
  quick: 'chat10',
  standard: 'video15',
  inspection: 'diagnostic',
  diagnostic: 'diagnostic',
};

const STRIPE_IDS: Record<PlanKey, string | undefined> = {
  chat10: process.env.STRIPE_PRICE_CHAT10,
  video15: process.env.STRIPE_PRICE_VIDEO15,
  diagnostic: process.env.STRIPE_PRICE_DIAGNOSTIC,
};

function assertStripePriceId(id: string | undefined, name: string) {
  if (!id) {
    throw new Error(`[pricing] Missing env for ${name}`);
  }
  if (!id.startsWith('price_')) {
    throw new Error(
      `[pricing] ${name} must start with "price_". Got "${id}". Check your Stripe Dashboard and .env`
    );
  }
}

// Only validate Stripe IDs on the server (where process.env is available)
if (typeof window === 'undefined') {
  assertStripePriceId(STRIPE_IDS.chat10, 'STRIPE_PRICE_CHAT10');
  assertStripePriceId(STRIPE_IDS.video15, 'STRIPE_PRICE_VIDEO15');
  assertStripePriceId(STRIPE_IDS.diagnostic, 'STRIPE_PRICE_DIAGNOSTIC');
}

type PlanConfig = {
  name: string;
  priceCents: number;
  stripePriceId: string;
  description: string;

  // Marketing features (shown to users)
  features: string[];

  // Technical features (for conditional rendering)
  capabilities: {
    recording?: boolean;
    screenshot?: boolean;
    transcript?: boolean;
    fileSharing?: boolean;
    priority?: boolean;
    [key: string]: boolean | undefined;
  };

  // Session configuration
  duration: number; // in minutes
  fulfillment: 'chat' | 'video' | 'diagnostic';
};

export const PRICING: Record<string, PlanConfig> = {
  chat10: {
    name: 'Quick Chat (30 min)',
    priceCents: 999,
    stripePriceId: STRIPE_IDS.chat10 || '',
    description: 'Text-based consult for fast reassurance and triage.',
    features: [
      '30 minutes of private chat',
      'Share photos, videos, and scan data',
      'Action plan before the chat ends',
    ],
    capabilities: {
      fileSharing: true,
    },
    duration: 30, // minutes
    fulfillment: 'chat',
  },
  video15: {
    name: 'Standard Video (45 min)',
    priceCents: 2999,
    stripePriceId: STRIPE_IDS.video15 || '',
    description: 'Live video walkthrough to diagnose complex issues.',
    features: [
      '45 minute HD video call',
      'Screen sharing and guided inspections',
      'Recording link after the session',
    ],
    capabilities: {
      recording: true,
    },
    duration: 45, // minutes
    fulfillment: 'video',
  },
  diagnostic: {
    name: 'Full Diagnostic (60 min)',
    priceCents: 4999,
    stripePriceId: STRIPE_IDS.diagnostic || '',
    description: 'Comprehensive diagnostic session with written summary.',
    features: [
      '60 minute deep-dive with a senior mechanic',
      'Multi-system troubleshooting in one visit',
      'Detailed follow-up report with next steps',
    ],
    capabilities: {
      recording: true,
      screenshot: true,
      transcript: true,
      priority: true,
    },
    duration: 60, // minutes
    fulfillment: 'diagnostic',
  },

  // 🚀 FUTURE TIERS - Ready for expansion
  // Uncomment when Stripe prices are configured
  /*
  video30: {
    name: 'Extended Video (90 min)',
    priceCents: 4999,
    stripePriceId: process.env.STRIPE_PRICE_VIDEO30 || '',
    description: 'Extended session for complex diagnostics.',
    features: [
      '90 minute HD video call',
      'Recording and screenshots included',
      'Priority mechanic assignment',
    ],
    capabilities: {
      recording: true,
      screenshot: true,
      priority: true,
    },
    duration: 90,
    fulfillment: 'video',
  },
  video60: {
    name: 'Premium Video (120 min)',
    priceCents: 7999,
    stripePriceId: process.env.STRIPE_PRICE_VIDEO60 || '',
    description: 'Premium extended session with all features.',
    features: [
      '120 minute HD video call',
      'Full recording and transcript',
      'Priority support',
    ],
    capabilities: {
      recording: true,
      screenshot: true,
      transcript: true,
      priority: true,
    },
    duration: 120,
    fulfillment: 'video',
  },
  chat20: {
    name: 'Extended Chat (60 min)',
    priceCents: 1999,
    stripePriceId: process.env.STRIPE_PRICE_CHAT20 || '',
    description: 'Extended chat session with priority support.',
    features: [
      '60 minutes of private chat',
      'Unlimited file sharing',
      'Priority mechanic assignment',
    ],
    capabilities: {
      fileSharing: true,
      priority: true,
    },
    duration: 60,
    fulfillment: 'chat',
  },
  */
};

/**
 * Get plan configuration safely with fallback
 * @param planKey - The plan key (e.g., 'video15', 'diagnostic')
 * @returns PlanConfig or undefined if not found
 */
export function getPlanConfig(planKey: string): PlanConfig | undefined {
  return PRICING[planKey];
}

/**
 * Get plan duration in minutes
 * @param planKey - The plan key
 * @returns Duration in minutes (default: 30 for chat, 45 for video)
 */
export function getPlanDuration(planKey: string): number {
  const config = getPlanConfig(planKey);
  if (config) return config.duration;

  // Fallback: infer from plan name
  if (planKey.startsWith('chat')) return 30;
  if (planKey.startsWith('video') || planKey.startsWith('diagnostic')) return 45;
  return 30;
}

/**
 * Check if plan has a specific capability
 * @param planKey - The plan key
 * @param capability - The capability to check
 * @returns true if plan has the capability
 */
export function hasPlanCapability(planKey: string, capability: keyof PlanConfig['capabilities']): boolean {
  const config = getPlanConfig(planKey);
  return config?.capabilities?.[capability] === true;
}
