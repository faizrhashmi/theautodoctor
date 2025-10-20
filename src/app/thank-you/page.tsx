import Link from "next/link";
import { stripe } from "@/lib/stripe";
import MechanicInvite from "./MechanicInvite";

export default async function ThankYou({ searchParams }: { searchParams: { session_id?: string } }) {
  let plan: string | null = null;
  let amount_total: number | null = null;
  const sessionId = searchParams?.session_id ?? null;

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      plan = (session.metadata as any)?.plan ?? null;
      amount_total = session.amount_total ?? null;
    } catch (e) {}
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold text-center">You're booked!</h1>
      <p className="mt-2 text-center text-slate-600">
        {plan ? (
          <>Payment confirmed for <b>{plan}</b>{amount_total ? ` — $${(amount_total / 100).toFixed(2)}` : ''}.</>
        ) : (
          <>We’ve received your session. You’ll get an email with details shortly.</>
        )}
      </p>

      <div className="mt-6 flex justify-center gap-3">
        {sessionId ? (
          <Link href={`/signup?session_id=${encodeURIComponent(sessionId)}`} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Start session now
          </Link>
        ) : (
          <Link href="/signup" className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">Start now</Link>
        )}
        <Link href="/" className="rounded-xl border px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Back home</Link>
      </div>

      {sessionId && (
        <div className="mt-10 rounded-2xl border p-4">
          <h2 className="text-lg font-semibold">Invite your mechanic</h2>
          <p className="mt-1 text-sm text-slate-600">Share this secure join link so a certified mechanic can enter your session.</p>
          <MechanicInvite sessionId={sessionId} />
        </div>
      )}
    </main>
  );
}
