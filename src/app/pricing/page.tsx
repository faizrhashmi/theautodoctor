import Link from "next/link";

export const metadata = {
  title: "Pricing | AskAutoDoctor",
  description: "Ontario launch pricing for AskAutoDoctor — try your first mechanic consultation free, then pay-as-you-go with low, transparent rates.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
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
              <span className="block text-white/90">Then simple, pay-as-you-go pricing.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/80">
              Talk to a certified mechanic without leaving home. If you’re not satisfied, it’s on us — 100% money-back guarantee.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/intake?plan=trial" className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600">Start free session</Link>
              <Link href="/how-it-works" className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white hover:bg-white/10">See how it works</Link>
            </div>
            <p className="mt-4 text-sm text-white/70">No credit card required for the free session.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Pay as you go</h2>
          <p className="mt-3 text-slate-600">Transparent, flat pricing — way less than a dealership visit.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <div className="absolute -top-3 right-4 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 shadow">Best for First-Timers</div>
            <h3 className="text-lg font-semibold">First Consultation</h3>
            <p className="mt-1 text-sm text-slate-600">Try it risk-free.</p>
            <div className="mt-4 text-3xl font-bold">FREE<span className="text-base font-medium text-slate-500"> / $1</span></div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• 5–10 min live triage</li>
              <li>• Real mechanic, not AI</li>
              <li>• Clear next steps</li>
            </ul>
            <Link href="/intake?plan=trial" className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Start free</Link>
          </div>

          <div className="relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <h3 className="text-lg font-semibold">Quick Chat</h3>
            <p className="mt-1 text-sm text-slate-600">10 minutes text + photos</p>
            <div className="mt-4 text-3xl font-bold">$9.99</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Instant advice + DIY tips</li>
              <li>• Parts guidance & cost ballpark</li>
              <li>• 24h follow-up</li>
            </ul>
            <Link href="/intake?plan=chat10" className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Choose Quick Chat</Link>
          </div>

          <div className="relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <div className="absolute -top-3 right-4 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 shadow">Most Popular</div>
            <h3 className="text-lg font-semibold">Video Call (15 min)</h3>
            <p className="mt-1 text-sm text-slate-600">Show us the sound, leak, or dash lights</p>
            <div className="mt-4 text-3xl font-bold">$29.99</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Real-time troubleshooting</li>
              <li>• Safety & drivability check</li>
              <li>• Next-step plan you can keep</li>
            </ul>
            <Link href="/intake?plan=video15" className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Choose Video Call</Link>
          </div>

          <div className="relative flex flex-col rounded-3xl border border-slate-200 p-6 shadow-sm transition hover:shadow-lg">
            <h3 className="text-lg font-semibold">Diagnostic / Estimate</h3>
            <p className="mt-1 text-sm text-slate-600">Upload codes, symptoms & quotes</p>
            <div className="mt-4 text-3xl font-bold">$49–$79</div>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              <li>• Mechanic-written estimate</li>
              <li>• Parts + labour breakdown</li>
              <li>• Save vs. dealership pricing</li>
            </ul>
            <Link href="/intake?plan=diagnostic" className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Choose Diagnostic</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
