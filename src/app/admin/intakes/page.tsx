import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes';

type Intake = {
  id: string;
  created_at: string;
  plan: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  vin: string | null;
  year: string | null;
  make: string | null;
  model: string | null;
  city: string | null;
  concern: string | null;
  files: string[] | null;
};

function parseBucketAndPath(full: string) {
  // stored like "bucket/path/to/file.ext" or just "path/to/file"
  const firstSlash = full.indexOf('/');
  if (firstSlash === -1) return { bucket: BUCKET, path: full };
  const bucket = full.slice(0, firstSlash);
  const path = full.slice(firstSlash + 1);
  return { bucket, path };
}

async function getSignedUrl(fullPath: string) {
  if (!supabaseAdmin) return null;
  const { bucket, path } = parseBucketAndPath(fullPath);
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export default async function AdminIntakesPage() {
  if (!supabaseAdmin) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold">Intakes</h1>
        <p className="mt-2 text-red-600">Supabase server credentials are not configured.</p>
      </main>
    );
  }

  const { data, error } = await supabaseAdmin
    .from('intakes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-2xl font-bold">Intakes</h1>
        <p className="mt-2 text-red-600">{error.message}</p>
      </main>
    );
  }

  const intakes = (data || []) as unknown as Intake[];

  // precompute signed urls for files
  const rows = await Promise.all(intakes.map(async (it) => {
    const fileLinks: { name: string; url: string | null }[] = [];
    (it.files || []).forEach(() => {});
    if (Array.isArray(it.files)) {
      for (const f of it.files) {
        const name = f.split('/').pop() || 'file';
        const url = await getSignedUrl(f);
        fileLinks.push({ name, url });
      }
    }
    return { it, fileLinks };
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Intakes</h1>
        <form action="/api/admin/logout" method="post">
          <button className="rounded-lg border px-3 py-2 text-sm">Logout</button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Created</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Concern</th>
              <th className="p-3">Files</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ it, fileLinks }) => (
              <tr key={it.id} className="border-t align-top">
                <td className="p-3 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                <td className="p-3">{it.plan}</td>
                <td className="p-3">
                  <div className="font-medium">{it.name || '-'}</div>
                  <div className="text-slate-600">{it.email || '-'}</div>
                  <div className="text-slate-600">{it.phone || '-'}</div>
                  <div className="text-slate-600">{it.city || '-'}</div>
                </td>
                <td className="p-3">
                  <div>{[it.year, it.make, it.model].filter(Boolean).join(' ') || '-'}</div>
                  <div className="text-slate-600">{it.vin || '-'}</div>
                </td>
                <td className="p-3 max-w-xs">
                  <div className="line-clamp-4">{it.concern || '-'}</div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {fileLinks.length === 0 ? (
                      <span className="text-slate-500">—</span>
                    ) : fileLinks.map((f, i) => (
                      f.url ? <a key={i} href={f.url} target="_blank" className="text-blue-600 hover:underline">{f.name}</a> : <span key={i} className="text-slate-500">{f.name}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
