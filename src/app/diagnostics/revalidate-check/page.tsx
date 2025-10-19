// src/app/diagnostics/revalidate-check/page.tsx
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function RevalidateCheckPage() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  const url = `${proto}://${host}/api/diagnose/revalidate`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Diagnostics API failed: ${res.status} ${text}`);
  }
  const data = await res.json();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Revalidate Scanner</h1>
      <p className="text-slate-600 mt-1">
        Looking for invalid <code>revalidate</code> object usage in your repo.
      </p>

      {data?.error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <pre className="whitespace-pre-wrap">{String(data.error)}</pre>
        </div>
      )}

      {Array.isArray(data?.hits) && data.hits.length === 0 && (
        <p className="mt-4 text-emerald-700">No invalid patterns found.</p>
      )}

      {Array.isArray(data?.hits) && data.hits.length > 0 && (
        <div className="mt-4 rounded-lg border p-4">
          <ul className="space-y-2">
            {data.hits.map((h: any, i: number) => (
              <li key={i} className="text-sm">
                <code className="font-mono">{h.file}:{h.line}</code> — <b>{h.match}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
