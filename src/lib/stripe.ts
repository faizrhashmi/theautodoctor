// src/lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // We intentionally pin to the stable 2024-06-20 API.
  // stripe@19.* types currently pin LatestApiVersion to "2025-09-30.clover",
  // so we assert to satisfy the type checker.
  apiVersion: '2024-06-20' as unknown as Stripe.LatestApiVersion,
  appInfo: { name: 'AskAutoDoctor', version: '0.1.0' },
});
