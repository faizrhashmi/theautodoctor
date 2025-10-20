'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

function getRedirectTarget(planId: (typeof TIERS)[number]['id']): string {
  if (planId === 'free') {
    return '/customer/dashboard';
  }
  return '/signup';
}

export default function PlanSelectionClient({ email }: { email: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-blue-100">
        <p className="text-xs uppercase tracking-[0.25em] text-blue-200">Signed in as</p>
        <p className="mt-1 text-base font-semibold text-white">{email}</p>
        <p className="mt-2 text-blue-100">
          Your selection unlocks scheduling and payment options inside the dashboard. You can switch plans before paying.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
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
            className={`group relative flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/10 p-6 text-left text-white transition hover:border-blue-400/80 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
              submitting && submitting !== tier.id ? 'opacity-60 blur-[0.4px]' : ''
            }`}
          >
            <div>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-200">
                {tier.duration}
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-white">{tier.name}</h2>
              <p className="mt-2 text-sm text-slate-200">{tier.description}</p>
              <p className="mt-4 text-3xl font-bold text-white">{tier.price}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-200">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-300" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 text-xs text-blue-100">{tier.recommendedFor}</div>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition group-hover:border-blue-300 group-hover:bg-blue-500/40">
              <span>{tier.id === 'free' ? 'Start free session' : 'Continue with this plan'}</span>
              <span className="text-blue-200 group-hover:text-white">{submitting === tier.id ? 'Saving…' : '→'}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
