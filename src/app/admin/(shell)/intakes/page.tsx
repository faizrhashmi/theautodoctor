'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import StatusBadge from './StatusBadge';

type Intake = {
  id: string;
  created_at: string;
  name?: string | null;
  customer_name?: string | null;
  email?: string | null;
  phone?: string | null;
  vin?: string | null;
  plan?: string | null;
  files?: unknown;
  status:
    | 'new'
    | 'pending'
    | 'in_review'
    | 'in_progress'
    | 'awaiting_customer'
    | 'resolved'
    | 'cancelled';
};

type QueryResponse = {
  rows: Intake[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Intake['status'][] = [
  'new',
  'pending',
  'in_review',
  'in_progress',
  'awaiting_customer',
  'resolved',
  'cancelled',
];

const PLAN_OPTIONS = [
  { value: '', label: 'All plans' },
  { value: 'free', label: 'Free Session (5m chat)' },
  { value: 'quick', label: 'Quick Chat (30m chat)' },
  { value: 'standard', label: 'Standard Video (45m)' },
  { value: 'diagnostic', label: 'Full Diagnostic (60m)' },
  { value: 'membership', label: 'Membership' },
];

function toISODate(d?: Date | null) {
  if (!d) return '';
  const off = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  ).toISOString();
  return off.slice(0, 10);
}

function intakeHasAttachments(files: unknown) {
  if (!files) return false;
  if (Array.isArray(files)) return files.length > 0;
  if (typeof files === 'string') return files.length > 0;
  if (typeof files === 'object') {
    const maybe = files as { paths?: unknown };
    if (Array.isArray(maybe.paths)) return maybe.paths.length > 0;
    return Object.keys(maybe).length > 0;
  }
  return false;
}

function PaperClipIcon() {
  return (
    <svg
      className="h-4 w-4 text-slate-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <path
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21.44 11.05-9.9 9.9a5.25 5.25 0 1 1-7.42-7.42l9.9-9.9a3.5 3.5 0 0 1 4.95 4.95l-9.9 9.9a1.75 1.75 0 1 1-2.47-2.47l9.9-9.9"
      />
    </svg>
  );
}

export default function AdminIntakesPage() {
  // Filters
  const [plan, setPlan] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [vin, setVin] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Data
  const [page, setPage] = useState<number>(1);
  const [rows, setRows] = useState<Intake[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [deleteError, setDeleteError] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  async function fetchIntakes() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (plan) params.set('plan', plan);
      if (status) params.set('status', status);
      if (vin) params.set('vin', vin.trim());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (search) params.set('q', search.trim()); // Fixed: 'q' instead of 'search'

      console.log('📡 Fetching intakes with params:', Object.fromEntries(params));
      
      const res = await fetch(`/api/admin/intakes/query?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      
      console.log('📡 Response status:', res.status);
      
      if (!res.ok) {
        throw new Error(`Query failed: ${res.status}`);
      }
      
      const json: QueryResponse = await res.json();
      console.log('📡 Received data:', { total: json.total, rows: json.rows?.length });
      
      setRows(json.rows || []);
      setCount(json.total || 0);
    } catch (e: any) {
      console.error('❌ Fetch error:', e);
      setError(e?.message || 'Failed to load intakes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIntakes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, plan, status, vin, fromDate, toDate, search]);

  function resetFilters() {
    setPlan('');
    setStatus('');
    setVin('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  function downloadCSV() {
  const headers = [
    'id',
    'created_at',
    'name',
    'email',
    'phone',
    'vin',
    'plan',
    'status',
    ];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.created_at,
          r.name ?? r.customer_name ?? '',
          r.email ?? '',
          r.phone ?? '',
          r.vin ?? '',
          r.plan ?? '',
          r.status,
        ]
          .map((v) =>
            String(v)
              .replace(/"/g, '""')
              .replace(/\n/g, ' ')
          )
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `intakes-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function updateStatus(id: string, newStatus: Intake['status']) {
    console.log('🔄 Updating status:', { id, newStatus });
    
    // optimistic update
    const prev = [...rows];
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    try {
      const res = await fetch('/api/admin/intakes/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ id, status: newStatus }),
      });
      
      console.log('🔄 Update response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `Update failed: ${res.status}`);
      }
      
      const result = await res.json();
      console.log('✅ Update successful:', result);
      
      // Refresh the data to ensure consistency
      await fetchIntakes();
    } catch (e: any) {
      // rollback on failure
      setRows(prev);
      console.error('❌ Status update error:', e);
      alert(`Failed to update status: ${e.message}`);
    }
  }

  async function deleteIntake(id: string) {
    if (!window.confirm('Delete this intake? This action cannot be undone.')) return;
    setDeleteError('');
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/intakes/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Delete failed: ${res.status}`);
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error('Delete intake failed:', err);
      setDeleteError(err?.message || 'Failed to delete intake');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header / Crumbs */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Admin / Intakes</h1>
              <p className="text-sm text-slate-500">
                Search, filter, export, and manage intake statuses.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Showing {rows.length} of {count} total intakes
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/intakes/deletions"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Deletion Log
              </Link>
              <button
                onClick={downloadCSV}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </button>
              <Link
                href="/admin"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Admin Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search (name/email/phone/VIN)</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g., John / 647- / WDB..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Plan</label>
            <select
              value={plan}
              onChange={(e) => {
                setPlan(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">VIN</label>
            <input
              value={vin}
              onChange={(e) => {
                setVin(e.target.value);
                setPage(1);
              }}
              placeholder="VIN (partial ok)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              max={toISODate(new Date())}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              max={toISODate(new Date())}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={resetFilters}
            className="text-sm text-slate-600 underline underline-offset-4 hover:text-slate-800"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Table */}
      {deleteError && (
        <div className="mx-auto max-w-7xl px-4 pb-2">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {deleteError}
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th>Created</th>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>VIN</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th className="w-40">Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {error && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-rose-600">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                      No results found. {count > 0 ? 'Try adjusting your filters.' : 'No intake records found in database.'}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="[&>td]:px-4 [&>td]:py-3">
                    <td className="whitespace-nowrap text-slate-600">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap">
                      <Link 
                        href={`/admin/intakes/${r.id}/details`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {r.name || r.customer_name || '-'}
                      </Link>
                      {intakeHasAttachments(r.files) && (
                        <span
                          aria-label="Has attachments"
                          title="Attachments uploaded"
                          className="ml-2 inline-flex items-center"
                        >
                          <PaperClipIcon />
                        </span>
                      )}
                      <div className="text-xs text-slate-500">{r.id.slice(0, 8)}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="text-slate-700">{r.email || '—'}</div>
                      <div className="text-xs text-slate-500">{r.phone || ''}</div>
                    </td>
                    <td className="whitespace-nowrap font-mono text-slate-700">
                      {r.vin || '—'}
                    </td>
                    <td className="whitespace-nowrap capitalize text-slate-700">
                      {r.plan ?? '-'}
                    </td>
                    <td className="whitespace-nowrap">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            updateStatus(r.id, e.target.value as Intake['status'])
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => deleteIntake(r.id)}
                          disabled={deletingId === r.id}
                          className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingId === r.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-3 text-sm text-slate-600">
            <div>
              Page <span className="font-medium">{page}</span> of{' '}
              <span className="font-medium">{totalPages}</span> ·{' '}
              <span className="font-medium">{count}</span> total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



