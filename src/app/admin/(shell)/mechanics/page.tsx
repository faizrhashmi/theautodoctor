// @ts-nocheck
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
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
      <span className="text-xs text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-sm font-medium text-white">{rating.toFixed(2)}</span>
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [actionMechanic, setActionMechanic] = useState<Mechanic | null>(null);
  const [activeAction, setActiveAction] = useState<
    | 'approve'
    | 'request_info'
    | 'adjust_rating'
    | 'notify'
    | 'reset'
    | 'suspend'
    | null
  >(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [ratingValue, setRatingValue] = useState<string>('');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [suspendDuration, setSuspendDuration] = useState<string>('7');
  const [actionStatus, setActionStatus] = useState<{
    type: 'success' | 'error'
    message: string
    detail?: string
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
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

  function openAction(mechanic: Mechanic, action: NonNullable<typeof activeAction>) {
    setActionMechanic(mechanic);
    setActiveAction(action);
    setActionStatus(null);
    setActionMessage('');
    setRatingValue(
      action === 'adjust_rating'
        ? mechanic.rating != null
          ? mechanic.rating.toFixed(2)
          : ''
        : ''
    );
    setSuspendReason('');
    setSuspendDuration('7');
    setMenuOpenId(null);
  }

  function closeAction() {
    setActionMechanic(null);
    setActiveAction(null);
    setActionStatus(null);
    setActionMessage('');
    setRatingValue('');
    setSuspendReason('');
    setSuspendDuration('7');
  }

  async function handleSendNotification() {
    if (!actionMechanic) return;
    const message = actionMessage.trim();
    if (!message) {
      setActionStatus({ type: 'error', message: 'Message cannot be empty.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionMechanic.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to send notification (status ${res.status})`);
      }
      setActionStatus({ type: 'success', message: data?.message || 'Notification logged.' });
      await fetchMechanics();
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to send notification.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!actionMechanic) return;

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionMechanic.id}/reset-password`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to reset password (status ${res.status})`);
      }
      setActionStatus({
        type: 'success',
        message: data?.message || 'Password reset link generated.',
        detail: data?.reset_link,
      });
      await fetchMechanics();
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to reset password.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSuspendMechanic() {
    if (!actionMechanic) return;
    if (!suspendReason.trim()) {
      setActionStatus({ type: 'error', message: 'Suspension reason is required.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionMechanic.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: suspendReason.trim(),
          duration_days: parseInt(suspendDuration, 10),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to suspend mechanic (status ${res.status})`);
      }
      setActionStatus({
        type: 'success',
        message: data?.message || 'Mechanic suspended.',
        detail: data?.suspended_until
          ? `Suspended until ${new Date(data.suspended_until).toLocaleString()}`
          : undefined,
      });
      await fetchMechanics();
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to suspend mechanic.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApproveMechanic() {
    if (!actionMechanic) return;
    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/mechanics/${actionMechanic.id}/approve`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to approve mechanic (status ${res.status})`);
      }
      setActionStatus({ type: 'success', message: 'Mechanic approved successfully.' });
      await fetchMechanics();
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to approve mechanic.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestInfo() {
    if (!actionMechanic) return;
    const message = actionMessage.trim();
    if (!message) {
      setActionStatus({ type: 'error', message: 'Please specify what additional information is needed.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/mechanics/${actionMechanic.id}/request_info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to request info (status ${res.status})`);
      }
      setActionStatus({ type: 'success', message: data?.message || 'Additional information requested.' });
      await fetchMechanics();
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to request information.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdjustRating() {
    if (!actionMechanic) return;
    const value = parseFloat(ratingValue);
    if (Number.isNaN(value) || value < 0 || value > 5) {
      setActionStatus({ type: 'error', message: 'Rating must be between 0 and 5.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/mechanics/${actionMechanic.id}/adjust-rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to adjust rating (status ${res.status})`);
      }
      setActionStatus({ type: 'success', message: 'Rating updated successfully.' });
      await fetchMechanics();
    } catch (error: any) {
      setActionStatus({ type: 'error', message: error?.message || 'Failed to adjust rating.' });
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
        await handleSuspendMechanic();
        break;
      case 'approve':
        await handleApproveMechanic();
        break;
      case 'request_info':
        await handleRequestInfo();
        break;
      case 'adjust_rating':
        await handleAdjustRating();
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
      ? 'Suspend Mechanic'
      : activeAction === 'approve'
      ? 'Approve Mechanic'
      : activeAction === 'request_info'
      ? 'Request Additional Information'
      : activeAction === 'adjust_rating'
      ? 'Adjust Rating'
      : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Mechanics Management</h1>
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
                className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
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
            <label className="mb-1 block text-xs font-medium text-slate-400">Search (name/email/phone)</label>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="e.g., John Mechanic, john@email.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Approval Status</label>
            <select
              value={approvalStatus}
              onChange={(e) => {
                setApprovalStatus(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            >
              {APPROVAL_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Online Status</label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm">
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
            <label className="mb-1 block text-xs font-medium text-slate-400">Joined From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={resetFilters}
            className="text-sm text-slate-400 underline underline-offset-4 hover:text-slate-100"
          >
            Reset filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-200">
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
                  <tr key={mechanic.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                    <td>
                      <div className="font-medium text-white">
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
                      <div className="text-slate-200">{mechanic.email}</div>
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
                      <RatingDisplay rating={mechanic.rating || 0} />
                    </td>
                    <td className="text-center font-medium text-white">
                      {mechanic.total_sessions || 0}
                    </td>
                    <td className="font-medium text-white">
                      ${(mechanic.total_earnings || 0).toFixed(2)}
                    </td>
                    <td className="text-slate-400">
                      {formatResponseTime(mechanic.avg_response_time)}
                    </td>
                    <td className="relative">
                      <button
                        onClick={() =>
                          setMenuOpenId((prev) => (prev === mechanic.id ? null : mechanic.id))
                        }
                        className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition"
                      >
                        Manage
                      </button>
                      {menuOpenId === mechanic.id && (
                        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-slate-700 bg-slate-950/95 p-2 shadow-lg">
                          {mechanic.approval_status !== 'approved' && (
                            <button
                              onClick={() => openAction(mechanic, 'approve')}
                              className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                            >
                              Approve Mechanic
                            </button>
                          )}
                          <button
                            onClick={() => openAction(mechanic, 'request_info')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Request Info
                          </button>
                          <button
                            onClick={() => openAction(mechanic, 'adjust_rating')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Adjust Rating
                          </button>
                          <button
                            onClick={() => openAction(mechanic, 'notify')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Send Notification
                          </button>
                          <button
                            onClick={() => openAction(mechanic, 'reset')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => openAction(mechanic, 'suspend')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-slate-200 hover:bg-slate-700/60"
                          >
                            Suspend Account
                          </button>
                          <Link
                            href={`/admin/mechanics/${mechanic.id}`}
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
          <div className="flex items-center justify-between border-t p-3 text-sm text-slate-400">
            <div>
              Page <span className="font-medium">{page}</span> of{' '}
              <span className="font-medium">{totalPages}</span> ·{' '}
              <span className="font-medium">{count}</span> total
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
        </div>
      </div>
    </div>

      {actionMechanic && activeAction && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={closeAction}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950/95 p-6 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">{actionTitle}</h3>
            <p className="mt-1 text-xs text-slate-400">
              Acting on {actionMechanic.name || actionMechanic.email} ({actionMechanic.email})
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
                    <p className="mt-2 break-all text-xs text-slate-200">{actionStatus.detail}</p>
                  )}
                </div>
              )}

              {activeAction === 'approve' && (
                <p className="text-sm text-slate-300">
                  Approve this mechanic to participate in the platform. The mechanic will be able to
                  accept session requests immediately.
                </p>
              )}

              {activeAction === 'request_info' && (
                <label className="block text-xs font-medium text-slate-300">
                  Additional Information Needed
                  <textarea
                    value={actionMessage}
                    onChange={(event) => setActionMessage(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Describe the documents or details you need from this mechanic."
                  />
                </label>
              )}

              {activeAction === 'adjust_rating' && (
                <label className="block text-xs font-medium text-slate-300">
                  Rating (0 - 5)
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={ratingValue}
                    onChange={(event) => setRatingValue(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </label>
              )}

              {activeAction === 'notify' && (
                <label className="block text-xs font-medium text-slate-300">
                  Message
                  <textarea
                    value={actionMessage}
                    onChange={(event) => setActionMessage(event.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Share updates, reminders, or requests with this mechanic."
                  />
                </label>
              )}

              {activeAction === 'reset' && (
                <p className="text-sm text-slate-300">
                  Generate a password reset link for this mechanic. The link will be displayed below
                  once created so you can send it manually.
                </p>
              )}

              {activeAction === 'suspend' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">
                    Reason for Suspension
                    <textarea
                      value={suspendReason}
                      onChange={(event) => setSuspendReason(event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Explain the policy violation or concern."
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Duration
                    <select
                      value={suspendDuration}
                      onChange={(event) => setSuspendDuration(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
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
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition"
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
                    : activeAction === 'approve'
                    ? 'Approve'
                    : activeAction === 'request_info'
                    ? 'Send Request'
                    : activeAction === 'adjust_rating'
                    ? 'Update Rating'
                    : activeAction === 'notify'
                    ? 'Send Notification'
                    : activeAction === 'reset'
                    ? 'Generate Link'
                    : 'Apply Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
