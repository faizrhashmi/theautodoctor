/**
 * @deprecated This file is being phased out in favor of the database-driven service_plans system.
 * New plans should be managed through the Admin UI at /admin/plans
 *
 * This config is kept for backward compatibility and fallback purposes.
 * Use the /api/plans endpoint and useServicePlans hook for new implementations.
 */

export type PlanKey = 'chat10' | 'video15' | 'diagnostic';

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

assertStripePriceId(STRIPE_IDS.chat10, 'STRIPE_PRICE_CHAT10');
assertStripePriceId(STRIPE_IDS.video15, 'STRIPE_PRICE_VIDEO15');
assertStripePriceId(STRIPE_IDS.diagnostic, 'STRIPE_PRICE_DIAGNOSTIC');

type PlanConfig = {
  name: string;
  priceCents: number;
  stripePriceId: string;
  description: string;
  features: string[];
  fulfillment: 'chat' | 'video' | 'diagnostic';
};

export const PRICING: Record<PlanKey, PlanConfig> = {
  chat10: {
    name: 'Quick Chat (30 min)',
    priceCents: 999,
    stripePriceId: STRIPE_IDS.chat10!,
    description: 'Text-based consult for fast reassurance and triage.',
    features: [
      '30 minutes of private chat',
      'Share photos, videos, and scan data',
      'Action plan before the chat ends',
    ],
    fulfillment: 'chat',
  },
  video15: {
    name: 'Standard Video (45 min)',
    priceCents: 2999,
    stripePriceId: STRIPE_IDS.video15!,
    description: 'Live video walkthrough to diagnose complex issues.',
    features: [
      '45 minute HD video call',
      'Screen sharing and guided inspections',
      'Recording link after the session',
    ],
    fulfillment: 'video',
  },
  diagnostic: {
    name: 'Full Diagnostic (60 min)',
    priceCents: 4999,
    stripePriceId: STRIPE_IDS.diagnostic!,
    description: 'Comprehensive diagnostic session with written summary.',
    features: [
      '60 minute deep-dive with a senior mechanic',
      'Multi-system troubleshooting in one visit',
      'Detailed follow-up report with next steps',
    ],
    fulfillment: 'diagnostic',
  },
};
