'use client';

import { useState } from 'react';

const SERVICE_OPTIONS = [
  { id: 'quick', label: 'Quick Chat (30 min)', priceCents: 999 },
  { id: 'standard', label: 'Standard Video (45 min)', priceCents: 2999 },
  { id: 'diagnostic', label: 'Full Diagnostic (60 min)', priceCents: 4999 },
];

const formatAmount = (cents: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100);

export default function BookPage() {
  const [service, setService] = useState(SERVICE_OPTIONS[0].id);
  const [loading, setLoading] = useState(false);

  function handleCheckout() {
    setLoading(true);
    window.location.href = `/api/checkout/create-session?plan=${service}`;
  }

  return (
    <section className="container py-20">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">Book a Session</h1>
        <p className="mt-2 text-sm text-slate-600">
          Select a plan and you will finish payment through Stripe. Pricing shown in CAD.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            {SERVICE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex items-center justify-between rounded-xl border p-4 transition ${
                  service === option.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="font-medium text-slate-900">{option.label}</div>
                  <div className="text-sm text-slate-600">{formatAmount(option.priceCents)}</div>
                </div>
                <input
                  type="radio"
                  name="service"
                  className="h-4 w-4 accent-blue-600"
                  checked={service === option.id}
                  onChange={() => setService(option.id)}
                />
              </label>
            ))}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-900">Summary</div>
            <p className="mt-2 text-sm text-slate-600">
              We will guide you through selecting a time after checkout.
            </p>
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Redirecting...' : 'Continue to Stripe'}
            </button>
            <div className="mt-3 text-xs text-slate-500">Stripe secured checkout. Cancel anytime before payment.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
