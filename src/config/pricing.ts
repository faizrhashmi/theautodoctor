export type PlanKey = 'chat10' | 'video15' | 'diagnostic';

export const PLAN_ALIASES: Record<string, PlanKey> = {
  quick: 'chat10',
  standard: 'video15',
  inspection: 'diagnostic',
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
    name: 'Quick Chat (10 min)',
    priceCents: 999,
    stripePriceId: STRIPE_IDS.chat10!,
    description: 'Private 1:1 text chat with a certified mechanic.',
    features: [
      '10 minutes private chat',
      'Red Seal/ASE certified mechanic',
      'Unbiased, no upsells',
    ],
    fulfillment: 'chat',
  },
  video15: {
    name: 'Live Video (15 min)',
    priceCents: 2999,
    stripePriceId: STRIPE_IDS.video15!,
    description: 'Face-to-face video consult for faster troubleshooting.',
    features: [
      '15 minutes live video',
      'Show sounds, leaks, codes live',
      'Action plan on the spot',
    ],
    fulfillment: 'video',
  },
  diagnostic: {
    name: 'Diagnostic Session',
    priceCents: 4999,
    stripePriceId: STRIPE_IDS.diagnostic!,
    description: 'Deeper diagnostic + summary and next steps.',
    features: [
      'Structured diagnostic flow',
      'Follow-up summary',
      'Repair readiness checklist',
    ],
    fulfillment: 'diagnostic',
  },
};
