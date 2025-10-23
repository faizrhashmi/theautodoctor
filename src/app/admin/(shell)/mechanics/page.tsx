// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Mechanic = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  account_status: string;
  approval_status: string;
  is_online: boolean;
  rating: number;
  total_sessions: number;
  total_earnings: number;
  avg_response_time?: number | null;
  specializations?: string[] | null;
  created_at: string;
  last_active_at?: string | null;
  suspended_until?: string | null;
  ban_reason?: string | null;
};

type QueryResponse = {
  rows: Mechanic[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'banned', label: 'Banned' },
];

const APPROVAL_OPTIONS = [
  { value: '', label: 'All approval statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    banned: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-800'}`}>
      {status}
    </span>
  );
}

function ApprovalBadge({ status }: { status: string }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-slate-100 text-slate-800'}`}>
      {status}
    </span>
  );
}

function OnlineIndicator({ isOnline }: { isOnline: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
      <span className="text-xs text-slate-600">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-sm font-medium text-slate-900">{rating.toFixed(2)}</span>
    </div>
  );
}

export default function MechanicsPage() {
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<string>('');
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [rows, setRows] = useState<Mechanic[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  async function fetchMechanics() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (search) params.set('q', search.trim());
      if (status) params.set('status', status);
      if (approvalStatus) params.set('approvalStatus', approvalStatus);
      if (onlineOnly) params.set('onlineOnly', 'true');
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/admin/users/mechanics?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Query failed: ${res.status}`);
      }

      const json: QueryResponse = await res.json();
      setRows(json.rows || []);
      setCount(json.total || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMechanics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, approvalStatus, onlineOnly, fromDate, toDate]);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setApprovalStatus('');
    setOnlineOnly(false);
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  function downloadCSV() {
    const headers = ['id', 'name', 'email', 'phone', 'account_status', 'approval_status', 'is_online', 'rating', 'total_sessions', 'total_earnings', 'avg_response_time', 'created_at'];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.name ?? '',
          r.email,
          r.phone ?? '',
          r.account_status,
          r.approval_status,
          r.is_online,
          r.rating,
          r.total_sessions,
          r.total_earnings,
          r.avg_response_time ?? '',
          r.created_at,
        ]
          .map((v) => String(v).replace(/"/g, '""').replace(/\n/g, ' '))
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.download = `mechanics-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function formatResponseTime(seconds?: number | null): string {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Mechanics Management</h1>
              <p className="text-sm text-slate-500">
                Manage mechanic accounts, approve applications, and monitor performance
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Showing {rows.length} of {count} total mechanics
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadCSV}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </button>
              <Link
                href="/admin"
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
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
            <label className="mb-1 block text-xs font-medium text-slate-600">Search (name/email/phone)</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g., John Mechanic, john@email.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Account Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Approval Status</label>
            <select
              value={approvalStatus}
              onChange={(e) => {
                setApprovalStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            >
              {APPROVAL_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Online Status</label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={(e) => {
                  setOnlineOnly(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded text-orange-600 focus:ring-2 focus:ring-orange-500"
              />
              Online only
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Joined From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
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
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th>Mechanic</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Online</th>
                  <th>Rating</th>
                  <th>Sessions</th>
                  <th>Earnings</th>
                  <th>Avg Response</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      No mechanics found.
                    </td>
                  </tr>
                )}
                {rows.map((mechanic) => (
                  <tr key={mechanic.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-slate-50">
                    <td>
                      <div className="font-medium text-slate-900">
                        {mechanic.name || 'Unnamed Mechanic'}
                      </div>
                      <div className="text-xs text-slate-500">{mechanic.id.slice(0, 8)}</div>
                      {mechanic.specializations && mechanic.specializations.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {mechanic.specializations.slice(0, 2).map((spec, idx) => (
                            <span key={idx} className="inline-flex rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                              {spec}
                            </span>
                          ))}
                          {mechanic.specializations.length > 2 && (
                            <span className="text-xs text-slate-500">+{mechanic.specializations.length - 2}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-slate-700">{mechanic.email}</div>
                      {mechanic.phone && (
                        <div className="text-xs text-slate-500">{mechanic.phone}</div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={mechanic.account_status} />
                      {mechanic.suspended_until && new Date(mechanic.suspended_until) > new Date() && (
                        <div className="text-xs text-yellow-600 mt-1">
                          Until {new Date(mechanic.suspended_until).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      <ApprovalBadge status={mechanic.approval_status} />
                    </td>
                    <td>
                      <OnlineIndicator isOnline={mechanic.is_online} />
                    </td>
                    <td>
                      <RatingDisplay rating={mechanic.rating} />
                    </td>
                    <td className="text-center font-medium text-slate-900">
                      {mechanic.total_sessions}
                    </td>
                    <td className="font-medium text-slate-900">
                      ${mechanic.total_earnings.toFixed(2)}
                    </td>
                    <td className="text-slate-600">
                      {formatResponseTime(mechanic.avg_response_time)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/mechanics/${mechanic.id}`}
                        className="text-sm font-medium text-orange-600 hover:text-orange-700 hover:underline"
                      >
                        View Details
                      </Link>
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
