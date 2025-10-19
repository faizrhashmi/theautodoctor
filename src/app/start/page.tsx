'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function Start() {
  const router = useRouter();
  const sp = useSearchParams();
  const sessionId = sp.get('session_id');
  const isTrial = sp.get('trial') === '1';
  const intakeId = sp.get('intake_id') || '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function beginPaid() {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/session/start?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to start session');
      router.push(`/video?token=${encodeURIComponent(data.token)}&room=${encodeURIComponent(data.room)}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function beginTrial() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/livekit/token?identity=trial-${intakeId}&room=aad-${Date.now()}`);
      const data = await res.json();
      router.push(`/video?token=${encodeURIComponent(data.token)}&room=${encodeURIComponent(data.room)}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold">Start your session</h1>
      {!isTrial && !sessionId ? (
        <p className="mt-2 text-slate-600">Missing <code>session_id</code>. Please start from your Thank‑you page after checkout.</p>
      ) : (
        <>
          <p className="mt-2 text-slate-600">We’ll open your private room now.</p>
          <div className="mt-6 flex items-center gap-3">
            {isTrial ? (
              <button onClick={beginTrial} disabled={loading} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {loading ? 'Preparing…' : 'Enter room (trial)'}
              </button>
            ) : (
              <button onClick={beginPaid} disabled={loading} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {loading ? 'Preparing…' : 'Enter room'}
              </button>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </>
      )}
    </main>
  );
}
