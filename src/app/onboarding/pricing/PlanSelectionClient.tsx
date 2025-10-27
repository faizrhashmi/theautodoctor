"use client";

import { useState } from 'react';

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
  return `/intake?plan=${planId}`;
}

type PlanSelectionClientProps = {
  hasActiveSessions: boolean;
};

export default function PlanSelectionClient({ hasActiveSessions }: PlanSelectionClientProps) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(planId: (typeof TIERS)[number]['id']) {
    if (submitting || hasActiveSessions) return;
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

      // Use window.location.href for a full page reload to ensure fresh data
      window.location.href = getRedirectTarget(planId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save your plan.';
      setError(message);
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pb-12">
      {error && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => handleSelect(tier.id)}
            disabled={Boolean(submitting) || hasActiveSessions}
            className={`group relative flex h-full flex-col justify-between rounded-3xl border p-6 text-left shadow-sm backdrop-blur transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/50 ${
              hasActiveSessions
                ? 'cursor-not-allowed border-slate-600/30 bg-slate-800/20 opacity-50'
                : submitting && submitting !== tier.id
                ? 'opacity-60 border-white/10 bg-white/5'
                : tier.id === 'diagnostic'
                ? 'border-orange-400/30 bg-orange-500/10 text-white hover:border-orange-400/50 hover:bg-orange-500/10 hover:shadow-lg'
                : 'border-white/10 bg-white/5 text-white hover:border-orange-400/50 hover:bg-orange-500/10 hover:shadow-lg'
            }`}
          >
            {hasActiveSessions && (
              <div className="absolute top-4 right-4">
                <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            )}
            <div>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                hasActiveSessions
                  ? 'border-slate-600/20 bg-slate-700/20 text-slate-500'
                  : 'border-white/20 bg-white/5 text-slate-300'
              }`}>
                {tier.duration}
              </span>
              <h2 className={`mt-4 text-2xl font-semibold ${hasActiveSessions ? 'text-slate-400' : 'text-white'}`}>
                {tier.name}
              </h2>
              <p className={`mt-2 text-sm ${hasActiveSessions ? 'text-slate-500' : 'text-slate-400'}`}>
                {tier.description}
              </p>
              <p className={`mt-4 text-3xl font-bold ${hasActiveSessions ? 'text-slate-400' : 'text-white'}`}>
                {tier.price}
              </p>
              <ul className={`mt-4 space-y-2 text-sm ${hasActiveSessions ? 'text-slate-500' : 'text-slate-300'}`}>
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className={`mt-1 inline-block h-1.5 w-1.5 rounded-full ${
                      hasActiveSessions ? 'bg-slate-600' : 'bg-orange-400'
                    }`} />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`mt-6 text-xs ${hasActiveSessions ? 'text-slate-600' : 'text-slate-400'}`}>
              {tier.recommendedFor}
            </div>
            <div className={`mt-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              hasActiveSessions
                ? 'border-slate-600/30 bg-slate-700/20 text-slate-500'
                : 'border-orange-400/30 bg-orange-500/10 text-white group-hover:border-orange-400/50 group-hover:bg-orange-500/20'
            }`}>
              <span>{hasActiveSessions ? 'Locked' : tier.id === 'free' ? 'Start free session' : 'Continue with this plan'}</span>
              <span className={hasActiveSessions ? 'text-slate-600' : 'text-orange-400 group-hover:text-orange-300'}>
                {hasActiveSessions ? '🔒' : submitting === tier.id ? 'Saving...' : 'Select →'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


