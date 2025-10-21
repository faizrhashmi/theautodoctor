"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const TIERS = [
  {
    id: 'quick',
    name: 'Quick Chat',
    price: '$9.99',
    duration: '30 minute live chat',
    description: 'Fast triage over private chat with a certified mechanic.',
    perks: [
      'Direct chat for photos, videos, and codes',
      'Action plan delivered before chat ends',
      'Great for warning lights or quick questions',
    ],
    recommendedFor: 'Ideal when you need quick reassurance or guidance.',
  },
  {
    id: 'standard',
    name: 'Standard Video',
    price: '$29.99',
    duration: '45 minute video session',
    description: 'Live video consultation to walk through complex issues.',
    perks: [
      'HD video with screen sharing',
      'Step-by-step troubleshooting and next steps',
      'Recording link after the call',
    ],
    recommendedFor: 'Perfect for noises, leaks, or guided inspections.',
  },
  {
    id: 'diagnostic',
    name: 'Full Diagnostic',
    price: '$49.99',
    duration: '60 minute video deep-dive',
    description: 'Comprehensive video session with written diagnostic report.',
    perks: [
      'Advanced testing walkthroughs',
      'Multi-system coverage in one call',
      'Summary email with repair roadmap',
    ],
    recommendedFor: 'Best for recurring issues or pre-purchase inspections.',
  },
  {
    id: 'free',
    name: 'Free Session',
    price: '$0',
    duration: 'Up to 5 minute chat',
    description: 'Try AskAutoDoctor with a short text-only session.',
    perks: [
      'Text chat with a mechanic',
      'Share one photo or video clip',
      'Quick first impressions and advice',
    ],
    recommendedFor: 'Use when you want to sample the platform or ask a quick yes/no question.',
  },
] as const;

function getRedirectTarget(_planId: (typeof TIERS)[number]['id']): string {
  return '/customer/dashboard';
}

export default function PlanSelectionClient({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSelect(planId: (typeof TIERS)[number]['id']) {
    if (submitting) return;
    setSubmitting(planId);
    setError(null);

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as any)?.error || 'Unable to save your plan.');
      }

      router.push(getRedirectTarget(planId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save your plan.';
      setError(message);
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-12">
      <div className="rounded-2xl border border-orange-400/30 bg-orange-600/10 p-6 text-sm text-orange-100/90 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-orange-200/90">Signed in as</p>
        <p className="mt-1 text-base font-semibold text-white">{displayName}</p>
        <p className="mt-2 text-orange-100/80">
          Your selection unlocks scheduling and payment options inside the dashboard. You can switch plans before paying.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (err) {
                // ignore
              }
              router.push('/signup');
            }}
            className="text-xs font-semibold text-orange-200 underline transition hover:text-orange-100"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/15 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => handleSelect(tier.id)}
            disabled={Boolean(submitting)}
            className={`group relative flex h-full flex-col justify-between rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6 text-left text-white shadow-[0_25px_60px_-35px_rgba(255,128,0,0.4)] transition duration-200 hover:border-orange-400/70 hover:bg-orange-500/20 hover:shadow-[0_28px_70px_-30px_rgba(255,160,60,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70 ${
              submitting && submitting !== tier.id ? 'opacity-60 blur-[0.4px]' : ''
            }`}
          >
            <div>
              <span className="inline-flex items-center rounded-full border border-orange-300/20 bg-orange-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-100/90">
                {tier.duration}
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-white">{tier.name}</h2>
              <p className="mt-2 text-sm text-orange-100/80">{tier.description}</p>
              <p className="mt-4 text-3xl font-bold text-white">{tier.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-orange-100/80">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-orange-300" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 text-xs text-orange-100/70">{tier.recommendedFor}</div>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-white transition group-hover:border-orange-300 group-hover:bg-orange-500/30">
              <span>{tier.id === 'free' ? 'Start free session' : 'Continue with this plan'}</span>
              <span className="text-orange-200 group-hover:text-white">{submitting === tier.id ? 'Saving...' : 'Select ->'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


