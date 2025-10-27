'use client';
import { useEffect, useState } from 'react';

export default function MechanicInvite({ sessionId }: { sessionId: string }) {
  const [link, setLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch(`/api/session/invite?session_id=${encodeURIComponent(sessionId)}`);

        if (!res.ok) {
          console.error('Failed to generate invite link:', res.status, res.statusText);
          setLink('');
          return;
        }

        const text = await res.text();
        if (!text) {
          console.error('Empty response from invite API');
          setLink('');
          return;
        }

        const data = JSON.parse(text);
        setLink(data.inviteUrl || '');
      } catch (error) {
        console.error('Error generating invite link:', error);
        setLink('');
      }
    }
    run();
  }, [sessionId]);

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500" value={link} readOnly placeholder="Generating link…" />
      <button onClick={copy} disabled={!link} className="rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-red-700 disabled:opacity-50">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  );
}
