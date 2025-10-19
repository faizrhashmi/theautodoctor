import Link from "next/link";

export const metadata = {
  title: "Pricing | AskAutoDoctor",
  description:
    "Ontario launch pricing for AskAutoDoctor — try your first mechanic consultation free, then pay-as-you-go with low, transparent rates.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,white,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 shadow-sm backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Ontario Launch • Limited-Time Offer
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl">
              First Session <span className="text-emerald-300">FREE</span>
              <span className="block text-white/90">Then simple, pay‑as‑you‑go pricing.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Talk to a certified mechanic without leaving home. If you’re not satisfied, it’s on us —
              100% money‑back guarantee.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start?promo=ontario-free"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600"
              >
                Start free session
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/70">No credit card required for the free session.</p>
          </div>
        </div>
      </section>

      {/* PAY-AS-YOU-GO GRID */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pay as you go</h2>
          <p className="mt-3 text-slate-600">Transparent, flat pricing — way less than a dealership visit.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Free / $1 Trial */}
          <div className="group relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <div className="absolute -top-3 right-4 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 shadow">
              Best for First‑Timers
            </div>
            <h3 className="text-lg font-semibold">First Consultation</h3>
            <p className="mt-1 text-sm text-slate-600">Try it risk‑free.</p>
            <div className="mt-4 text-3xl font-bold">
              FREE<span className="text-base font-medium text-slate-500"> / $1</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckIcon /> 5–10 min live triage
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Real mechanic, not AI
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Clear next steps
              </li>
            </ul>
            <Link
              href="/start?plan=trial"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Start free
            </Link>
          </div>

          {/* Quick Chat */}
          <div className="relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <h3 className="text-lg font-semibold">Quick Chat</h3>
            <p className="mt-1 text-sm text-slate-600">10 minutes text + photos</p>
            <div className="mt-4 text-3xl font-bold">$9.99</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckIcon /> Instant advice + DIY tips
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Parts guidance & cost ballpark
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> 24h follow‑up
              </li>
            </ul>
            <Link
              href="/api/checkout?plan=chat10"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Choose Quick Chat
            </Link>
          </div>

          {/* Video 15 */}
          <div className="relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <div className="absolute -top-3 right-4 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 shadow">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold">Video Call (15 min)</h3>
            <p className="mt-1 text-sm text-slate-600">Show us the sound, leak, or dash lights</p>
            <div className="mt-4 text-3xl font-bold">$29.99</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckIcon /> Real‑time troubleshooting
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Safety & drivability check
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Next‑step plan you can keep
              </li>
            </ul>
            <Link
              href="/api/checkout?plan=video15"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Choose Video Call
            </Link>
          </div>

          {/* Diagnostic / Estimate */}
          <div className="relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <h3 className="text-lg font-semibold">Diagnostic / Estimate</h3>
            <p className="mt-1 text-sm text-slate-600">Upload codes, symptoms & quotes</p>
            <div className="mt-4 text-3xl font-bold">$49–$79</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <CheckIcon /> Mechanic‑written estimate
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Parts + labour breakdown
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Save vs. dealership pricing
              </li>
            </ul>
            <Link
              href="/api/checkout?plan=diagnostic"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Choose Diagnostic
            </Link>
          </div>
        </div>

        {/* Guarantees */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Pill title="Money‑back guarantee" desc="If you don’t get value, you don’t pay." />
          <Pill title="Verified mechanics" desc="Red‑Seal & brand‑experienced experts." />
          <Pill title="Secure & private" desc="End‑to‑end encrypted sessions." />
        </div>
      </section>

      {/* COMPARISON */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 p-6">
            <h3 className="text-xl font-semibold">Why it’s cheaper than a shop</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-2 font-medium">Service</th>
                    <th className="py-2 font-medium">AskAutoDoctor</th>
                    <th className="py-2 font-medium">Dealership</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-3">Initial consult</td>
                    <td className="py-3">Free / $1</td>
                    <td className="py-3">$150–$220</td>
                  </tr>
                  <tr>
                    <td className="py-3">Quick advice</td>
                    <td className="py-3">$9.99</td>
                    <td className="py-3">$120–$180</td>
                  </tr>
                  <tr>
                    <td className="py-3">Diagnostic guidance</td>
                    <td className="py-3">$49–$79</td>
                    <td className="py-3">$180–$300</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Typical Ontario dealership pricing ranges. Actual rates vary.</p>
          </div>

          {/* Membership Teaser */}
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <h3 className="text-xl font-semibold">Memberships (coming soon)</h3>
            <p className="mt-1 text-slate-600">Perfect for families, rideshare drivers, and fleets.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Basic</div>
                <div className="text-2xl font-bold">
                  $14.99<span className="text-sm font-medium text-slate-500">/mo</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckIcon /> 2 chats / mo
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon /> 1 video / mo
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Pro</div>
                <div className="text-2xl font-bold">
                  $29.99<span className="text-sm font-medium text-slate-500">/mo</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckIcon /> 5 chats / mo
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon /> 2 videos / mo
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon /> Priority routing
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold">Family / Fleet</div>
                <div className="text-2xl font-bold">
                  $49.99<span className="text-sm font-medium text-slate-500">/mo</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckIcon /> Multiple vehicles
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon /> Unlimited chat*
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon /> Discounts on inspections
                  </li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">*Fair use policy applies.</p>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid items-center gap-6 rounded-3xl border border-slate-200 p-6 sm:grid-cols-3">
          <TrustItem title="Red‑Seal certified" subtitle="Brand‑experienced techs" />
          <Divider />
          <TrustItem title="24h follow‑up" subtitle="We stick with you" />
          <Divider className="hidden sm:block" />
          <TrustItem title="No upsells" subtitle="Advice only — your choice of shop" />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <h3 className="text-2xl font-bold">Frequently asked questions</h3>
        <div className="mt-6 divide-y divide-slate-200">
          <FAQ q="Is the first session really free?" a="Yes. During the Ontario launch, your first 5–10 minute triage is free (or $1 if required by payment provider). No credit card needed to start." />
          <FAQ q="What if I’m not satisfied?" a="If you don’t feel you got value, we’ll refund your session — no hassle." />
          <FAQ q="Can you actually diagnose online?" a="We guide you through smart checks, scan‑tool codes, sounds, and visuals. For anything requiring hands‑on testing, we’ll tell you exactly what to ask a shop and what a fair price looks like." />
          <FAQ q="Do you service all of Ontario?" a="Yes — because sessions are online. On‑site inspections are rolling out region‑by‑region." />
          <FAQ q="How are mechanics vetted?" a="Red‑Seal/certified experience, ID verification, work history screening, and ongoing QA on platform." />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 sm:p-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">Try AskAutoDoctor free today</h3>
              <p className="mt-1 text-white/80">Instant access to certified mechanics. No risk, huge peace of mind.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start?promo=ontario-free"
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600"
              >
                Start free
              </Link>
              <Link
                href="/pricing#payg"
                className="inline-flex items-center justify-center rounded-2xl bg-white/10 px-6 py-3 font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-5 w-5 flex-none text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.43.006L3.29 9.82a1 1 0 1 1 1.42-1.407l3.06 3.093 6.794-6.897a1 1 0 0 1 1.14-.319Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Pill({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-50 text-emerald-600">
        <svg className="h-8 w-8 p-1.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M9 2a1 1 0 0 1 1 0l6 3.333A1 1 0 0 1 17 7v6a1 1 0 0 1-.5.866L10 18a1 1 0 0 1-1 0l-6-3.134A1 1 0 0 1 2 13V7a1 1 0 0 1 .5-.867L9 2Z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="text-sm text-slate-600">{desc}</p>
      </div>
    </div>
  );
}

function TrustItem({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2 3 6v6c0 5 3.8 9.7 9 10 5.2-.3 9-5 9-10V6l-9-4Z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-sm text-slate-600">{subtitle}</div>
      </div>
    </div>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px w-full bg-slate-200 sm:h-10 sm:w-px ${className}`} />;
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <span className="text-base font-semibold text-slate-900">{q}</span>
        <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition group-open:rotate-45">
          +
        </span>
      </summary>
      <p className="mt-3 text-slate-700">{a}</p>
    </details>
  );
}
