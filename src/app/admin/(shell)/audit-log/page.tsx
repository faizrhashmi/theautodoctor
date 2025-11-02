'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';

type AdminAction = {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action_type: string;
  reason: string | null;
  metadata: any;
  created_at: string;
  admin: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  target: {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
  } | null;
};

type QueryResponse = {
  rows: AdminAction[];
  total: number;
  page: number;
  pageSize: number;
};

const PAGE_SIZE = 50;

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'CREATE_USER', label: 'Create User' },
  { value: 'DELETE_USER', label: 'Delete User' },
  { value: 'CHANGE_ROLE', label: 'Change Role' },
  { value: 'SUSPEND', label: 'Suspend' },
  { value: 'BAN', label: 'Ban' },
  { value: 'VERIFY_EMAIL', label: 'Verify Email' },
  { value: 'REACTIVATE', label: 'Reactivate' },
  { value: 'IMPERSONATE', label: 'Impersonate' },
];

function ActionTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CREATE_USER: 'bg-green-500/20 text-green-400 border-green-500/30',
    DELETE_USER: 'bg-red-500/20 text-red-400 border-red-500/30',
    CHANGE_ROLE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    SUSPEND: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    BAN: 'bg-red-500/20 text-red-400 border-red-500/30',
    VERIFY_EMAIL: 'bg-green-500/20 text-green-400 border-green-500/30',
    REACTIVATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IMPERSONATE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colors[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

export default function AuditLogPage() {
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'admin' });

  const [search, setSearch] = useState<string>('');
  const [actionType, setActionType] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [rows, setRows] = useState<AdminAction[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  async function fetchAuditLog() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (search) params.set('q', search.trim());
      if (actionType) params.set('actionType', actionType);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/admin/audit-log?${params.toString()}`, {
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
    fetchAuditLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, actionType, fromDate, toDate]);

  function resetFilters() {
    setSearch('');
    setActionType('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  function toggleExpand(id: string) {
    setExpandedRow(expandedRow === id ? null : id);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-800/30 backdrop-blur-sm mb-6">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Admin Audit Log</h1>
              <p className="text-sm text-slate-400">
                View all administrative actions and user management history
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Showing {rows.length} of {count} total actions
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1.5 text-sm font-medium text-white hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 transition"
            >
              Admin Home
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-400">Search (reason/metadata)</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search in reason or metadata..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Action Type</label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={resetFilters}
            className="text-sm text-slate-400 underline underline-offset-4 hover:text-slate-300 transition"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Admin</th>
                  <th>Target User</th>
                  <th>Reason</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                      No audit log entries found.
                    </td>
                  </tr>
                )}
                {rows.map((action) => (
                  <>
                    <tr key={action.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-slate-700/50 transition">
                      <td className="whitespace-nowrap text-slate-300">
                        {new Date(action.created_at).toLocaleString('en-CA')}
                      </td>
                      <td>
                        <ActionTypeBadge type={action.action_type} />
                      </td>
                      <td>
                        <div className="font-medium text-white">
                          {action.admin?.full_name || 'Unknown Admin'}
                        </div>
                        <div className="text-xs text-slate-500">{action.admin?.email}</div>
                      </td>
                      <td>
                        {action.target ? (
                          <>
                            <div className="font-medium text-white">
                              {action.target.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {action.target.email} ({action.target.role})
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-500 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="max-w-xs truncate text-slate-400">
                        {action.reason || <span className="text-slate-600">No reason provided</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleExpand(action.id)}
                          className="rounded-lg border border-slate-600 bg-slate-800/60 px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          {expandedRow === action.id ? 'Hide' : 'Details'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === action.id && (
                      <tr className="bg-slate-900/50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-2">
                            <div className="text-xs text-slate-400">
                              <strong className="text-slate-300">Action ID:</strong> {action.id}
                            </div>
                            {action.reason && (
                              <div className="text-xs text-slate-400">
                                <strong className="text-slate-300">Reason:</strong> {action.reason}
                              </div>
                            )}
                            {action.metadata && (
                              <div>
                                <strong className="text-xs text-slate-300">Metadata:</strong>
                                <pre className="mt-1 rounded-lg bg-slate-950/50 p-3 text-xs text-slate-400 overflow-x-auto">
                                  {JSON.stringify(action.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-700 p-3 text-sm text-slate-400">
            <div>
              Page <span className="font-medium text-white">{page}</span> of{' '}
              <span className="font-medium text-white">{totalPages}</span> ·{' '}
              <span className="font-medium text-white">{count}</span> total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 px-3 py-1.5 disabled:opacity-50 hover:bg-slate-700 hover:text-white transition"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 px-3 py-1.5 disabled:opacity-50 hover:bg-slate-700 hover:text-white transition"
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
