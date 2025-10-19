import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';

type SearchParams = {
  q?: string;
  plan?: string;
  from?: string;
  to?: string;
  page?: string;
};

const PAGE_SIZE = 25;

function parseDate(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(+d) ? null : d.toISOString();
}

export default async function DashboardIntakes({ searchParams }: { searchParams: SearchParams }) {
  if (!supabaseAdmin) {
    return <main className="mx-auto max-w-5xl px-6 py-12"><h1 className="text-2xl font-bold">Intakes</h1><p className="mt-2 text-red-600">Supabase server credentials are not configured.</p></main>;
  }

  const page = Math.max(1, parseInt(searchParams.page || '1', 10));
  const fromISO = parseDate(searchParams.from);
  const toISO = parseDate(searchParams.to);
  const q = (searchParams.q || '').trim();
  const plan = (searchParams.plan || '').trim();

  let query = supabaseAdmin.from('intakes').select('*', { count: 'exact' });

  if (fromISO) query = query.gte('created_at', fromISO);
  if (toISO) query = query.lte('created_at', toISO);
  if (plan) query = query.eq('plan', plan);
  if (q) {
    // Basic "or" search across a few text columns
    const like = `%${q}%`;
    query = query.or([
      `name.ilike.${like}`,
      `email.ilike.${like}`,
      `phone.ilike.${like}`,
      `city.ilike.${like}`,
      `vin.ilike.${like}`,
      `make.ilike.${like}`,
      `model.ilike.${like}`,
      `concern.ilike.${like}`,
    ].join(','));
  }

  query = query.order('created_at', { ascending: false });

  const rangeFrom = (page - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;
  query = query.range(rangeFrom, rangeTo);

  const { data, error, count } = await query;
  if (error) {
    return <main className="mx-auto max-w-5xl px-6 py-12"><h1 className="text-2xl font-bold">Intakes</h1><p className="mt-2 text-red-600">{error.message}</p></main>;
  }

  const pages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Intakes</h1>
        <div className="flex gap-2">
          <form action="/api/mechanics/logout" method="post">
            <button className="rounded-lg border px-3 py-2 text-sm">Logout</button>
          </form>
        </div>
      </div>

      <FilterBar initial={{ q, plan, from: searchParams.from || '', to: searchParams.to || '' }} />

      <div className="mt-4 overflow-x-auto rounded-xl border">
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
            {(data || []).map((it: any) => <IntakeRow key={it.id} it={it} />)}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} q={q} plan={plan} from={searchParams.from} to={searchParams.to} />
    </main>
  );
}

function IntakeRow({ it }: { it: any }) {
  return (
    <tr className="border-t align-top">
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
      <td className="p-3 max-w-xs"><div className="line-clamp-4">{it.concern || '-'}</div></td>
      <td className="p-3">
        <FileLinks files={it.files} />
      </td>
    </tr>
  );
}

async function getSignedUrl(fullPath: string) {
  const { supabaseAdmin } = await import('@/lib/supabaseAdmin');
  if (!supabaseAdmin) return null;
  const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes';
  const firstSlash = fullPath.indexOf('/');
  let bucket = BUCKET;
  let path = fullPath;
  if (firstSlash !== -1) { bucket = fullPath.slice(0, firstSlash); path = fullPath.slice(firstSlash + 1); }
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

async function FileLinks({ files }: { files: string[] | null }) {
  if (!files || files.length === 0) return <span className="text-slate-500">—</span>;
  const links = await Promise.all(files.map(async f => ({ name: f.split('/').pop() || 'file', url: await getSignedUrl(f) })));
  return (
    <div className="flex flex-col gap-1">
      {links.map((f, i) => f.url ? <a key={i} href={f.url} target="_blank" className="text-blue-600 hover:underline">{f.name}</a> : <span key={i} className="text-slate-500">{f.name}</span>)}
    </div>
  );
}

function Pagination({ page, pages, q, plan, from, to }:{ page:number; pages:number; q?:string; plan?:string; from?:string; to?:string }) {
  function mk(p:number) {
    const s = new URLSearchParams();
    if (q) s.set('q', q);
    if (plan) s.set('plan', plan);
    if (from) s.set('from', from);
    if (to) s.set('to', to);
    s.set('page', String(p));
    return `/dashboard/intakes?${s.toString()}`;
  }
  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-slate-600">Page {page} of {pages}</div>
      <div className="flex gap-2">
        <a href={mk(Math.max(1, page-1))} className="rounded border px-3 py-1 text-sm">Prev</a>
        <a href={mk(Math.min(pages, page+1))} className="rounded border px-3 py-1 text-sm">Next</a>
      </div>
    </div>
  );
}

function FilterBar({ initial }:{ initial: { q:string; plan:string; from:string; to:string } }) {
  return (
    <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-5" method="get">
      <input name="q" defaultValue={initial.q} placeholder="Search name, VIN, email, concern…" className="rounded-xl border px-3 py-2 text-sm md:col-span-2" />
      <select name="plan" defaultValue={initial.plan} className="rounded-xl border px-3 py-2 text-sm">
        <option value="">All plans</option>
        <option value="trial">trial</option>
        <option value="chat10">chat10</option>
        <option value="video15">video15</option>
        <option value="diagnostic">diagnostic</option>
      </select>
      <input type="date" name="from" defaultValue={initial.from} className="rounded-xl border px-3 py-2 text-sm" />
      <input type="date" name="to" defaultValue={initial.to} className="rounded-xl border px-3 py-2 text-sm" />
      <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-5 md:w-max">Apply filters</button>
    </form>
  );
}
