// @ts-nocheck
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';

type Customer = {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  role: string;
  account_status: string;
  email_verified: boolean;
  created_at: string;
  last_active_at?: string | null;
  suspended_until?: string | null;
  ban_reason?: string | null;
  total_sessions?: number;
  total_spent?: number;
  vehicle_info?: any;
};

type QueryResponse = {
  rows: Customer[];
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

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-xs text-green-600">
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      Verified
    </span>
  ) : (
    <span className="text-xs text-slate-500">Not verified</span>
  );
}

export default function CustomersPage() {
  // ✅ Auth guard - requires admin role
  const { isLoading: authLoading, user } = useAuthGuard({ requiredRole: 'admin' })

  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [emailVerified, setEmailVerified] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [rows, setRows] = useState<Customer[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [actionCustomer, setActionCustomer] = useState<Customer | null>(null);
  const [activeAction, setActiveAction] = useState<'notify' | 'reset' | 'suspend' | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [suspendDuration, setSuspendDuration] = useState<string>('7');
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string; detail?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count]
  );

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (search) params.set('q', search.trim());
      if (status) params.set('status', status);
      if (emailVerified) params.set('emailVerified', emailVerified);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await fetch(`/api/admin/users/customers?${params.toString()}`, {
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
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, emailVerified, fromDate, toDate]);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setEmailVerified('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  function downloadCSV() {
    const headers = ['id', 'email', 'full_name', 'phone', 'status', 'email_verified', 'created_at', 'total_sessions', 'total_spent'];
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.id,
          r.email,
          r.full_name ?? '',
          r.phone ?? '',
          r.account_status,
          r.email_verified,
          r.created_at,
          r.total_sessions ?? 0,
          r.total_spent ?? 0,
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
    a.download = `customers-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openAction(customer: Customer, action: 'notify' | 'reset' | 'suspend') {
    setActionCustomer(customer);
    setActiveAction(action);
    setActionStatus(null);
    setActionMessage('');
    setSuspendReason('');
    setSuspendDuration('7');
    setMenuOpenId(null);
  }

  function closeAction() {
    setActionCustomer(null);
    setActiveAction(null);
    setActionStatus(null);
    setActionMessage('');
    setSuspendReason('');
    setSuspendDuration('7');
  }

  async function handleSendNotification() {
    if (!actionCustomer) return;
    const message = actionMessage.trim();
    if (!message) {
      setActionStatus({ type: 'error', message: 'Message cannot be empty.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to send notification (status ${res.status})`);
      }

      setActionStatus({ type: 'success', message: data?.message || 'Notification logged.' });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to send notification.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!actionCustomer) return;

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/reset-password`, {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to generate reset link (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: data?.message || 'Password reset link generated.',
        detail: data?.reset_link,
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to reset password.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspendUser() {
    if (!actionCustomer) return;
    if (!suspendReason.trim()) {
      setActionStatus({ type: 'error', message: 'Suspension reason is required.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: suspendReason.trim(),
          duration_days: parseInt(suspendDuration, 10),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to suspend user (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: data?.message || 'User suspended successfully.',
        detail: data?.suspended_until ? `Suspended until ${new Date(data.suspended_until).toLocaleString('en-CA')}` : undefined,
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to suspend user.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAction) return;

    switch (activeAction) {
      case 'notify':
        await handleSendNotification();
        break;
      case 'reset':
        await handleResetPassword();
        break;
      case 'suspend':
        await handleSuspendUser();
        break;
      default:
        break;
    }
  }

  const actionTitle =
    activeAction === 'notify'
      ? 'Send Notification'
      : activeAction === 'reset'
      ? 'Reset Password'
      : activeAction === 'suspend'
      ? 'Suspend Account'
      : '';

  return (
    <>
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-800/30 backdrop-blur-sm mb-6">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Customers Management</h1>
              <p className="text-sm text-slate-400">
                Manage customer accounts, view activity, and perform actions
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Showing {rows.length} of {count} total customers
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadCSV}
                className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Export CSV
              </button>
              <Link
                href="/admin"
                className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1.5 text-sm font-medium text-white hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 transition"
              >
                Admin Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-400">Search (name/email/phone)</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g., John Smith, john@email.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Account Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Email Verified</label>
            <select
              value={emailVerified}
              onChange={(e) => {
                setEmailVerified(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Not Verified</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Joined From</label>
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

      {/* Table */}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          {/* Mobile scroll hint */}
          <div className="lg:hidden px-4 py-2 bg-slate-900/50 border-b border-slate-700 text-xs text-slate-400 text-center">
            ← Scroll horizontally to see all columns →
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                  <th className="sticky left-0 z-10 bg-slate-800">Customer</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Email Verified</th>
                  <th>Joined</th>
                  <th>Sessions</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                      No customers found.
                    </td>
                  </tr>
                )}
                {rows.map((customer) => (
                  <tr key={customer.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-slate-700/50 transition">
                    <td className="sticky left-0 z-10 bg-slate-800">
                      <div className="font-medium text-white">
                        {customer.full_name || 'Unnamed User'}
                      </div>
                      <div className="text-xs text-slate-500">{customer.id.slice(0, 8)}</div>
                    </td>
                    <td>
                      <div className="text-slate-300">{customer.email}</div>
                      {customer.phone && (
                        <div className="text-xs text-slate-500">{customer.phone}</div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={customer.account_status} />
                      {customer.suspended_until && new Date(customer.suspended_until) > new Date() && (
                        <div className="text-xs text-yellow-400 mt-1">
                          Until {new Date(customer.suspended_until).toLocaleDateString('en-CA')}
                        </div>
                      )}
                    </td>
                    <td>
                      <VerifiedBadge verified={customer.email_verified} />
                    </td>
                    <td className="whitespace-nowrap text-slate-400">
                      {new Date(customer.created_at).toLocaleDateString('en-CA')}
                    </td>
                    <td className="text-center font-medium text-white">
                      {customer.total_sessions ?? 0}
                    </td>
                    <td className="whitespace-nowrap text-slate-400">
                      {customer.last_active_at
                        ? new Date(customer.last_active_at).toLocaleDateString('en-CA')
                    : 'Never'}
                  </td>
                    <td className="relative">
                      <button
                        onClick={() =>
                          setMenuOpenId((prev) => (prev === customer.id ? null : customer.id))
                        }
                        className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
                      >
                        Manage
                      </button>
                      {menuOpenId === customer.id && (
                        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-lg">
                          <button
                            onClick={() => openAction(customer, 'notify')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Send Notification
                          </button>
                          <button
                            onClick={() => openAction(customer, 'reset')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => openAction(customer, 'suspend')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Suspend Account
                          </button>
                          <Link
                            href={`/admin/customers/${customer.id}`}
                            className="mt-1 block rounded-md px-2 py-2 text-sm font-medium text-orange-400 hover:bg-slate-700/60 hover:text-orange-300 transition"
                          >
                            View Details
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
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

    {actionCustomer && activeAction && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={closeAction}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">{actionTitle}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Acting on {actionCustomer.full_name || actionCustomer.email} ({actionCustomer.email})
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleActionSubmit}>
              {actionStatus && (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    actionStatus.type === 'success'
                      ? 'border-green-500/40 bg-green-500/10 text-green-200'
                      : 'border-red-500/40 bg-red-500/10 text-red-200'
                  }`}
                >
                  <p>{actionStatus.message}</p>
                  {actionStatus.detail && (
                    <p className="mt-2 break-all text-xs text-slate-200">
                      {actionStatus.detail}
                    </p>
                  )}
                </div>
              )}

              {activeAction === 'notify' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">
                    Message
                    <textarea
                      value={actionMessage}
                      onChange={(event) => setActionMessage(event.target.value)}
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Provide context and next steps for the customer..."
                    />
                  </label>
                </div>
              )}

              {activeAction === 'reset' && (
                <p className="text-sm text-slate-300">
                  Generate a password reset link. The link will appear below once created so you can
                  share it with the customer.
                </p>
              )}

              {activeAction === 'suspend' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">
                    Reason
                    <textarea
                      value={suspendReason}
                      onChange={(event) => setSuspendReason(event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Explain why this account is being suspended."
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Duration
                    <select
                      value={suspendDuration}
                      onChange={(event) => setSuspendDuration(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="1">1 day</option>
                      <option value="3">3 days</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAction}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:from-orange-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading
                    ? 'Processing...'
                    : activeAction === 'notify'
                    ? 'Send Notification'
                    : activeAction === 'reset'
                    ? 'Generate Link'
                    : 'Suspend Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
