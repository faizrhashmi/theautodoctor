
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function StartPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-600">Preparing your session…</div>}>
      <StartInner />
    </Suspense>
  );
}

function StartInner() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const trial = sp.get('trial');
    const plan = sp.get('plan');
    const intakeId = sp.get('intake_id');
    const sessionId = sp.get('session_id');

    // Trial or paid success -> enter session flow
    if (trial === '1' || sessionId) {
      router.replace('/video');
      return;
    }

    // If coming back from intake with plan
    if (plan && intakeId) {
      router.replace('/video');
      return;
    }

    // Fallback
    router.replace('/pricing');
  }, [router, sp]);

  return null;
}
