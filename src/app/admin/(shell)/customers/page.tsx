'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import UserDetailDrawer from '@/components/admin/users/UserDetailDrawer';

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
  const [activeAction, setActiveAction] = useState<'notify' | 'reset' | 'suspend' | 'ban' | 'verify' | 'delete' | 'create' | 'change-role' | null>(null);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [suspendDuration, setSuspendDuration] = useState<string>('7');
  const [banReason, setBanReason] = useState<string>('');
  const [deleteReason, setDeleteReason] = useState<string>('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<string>('');
  const [roleChangeData, setRoleChangeData] = useState({
    new_role: 'customer' as 'customer' | 'mechanic' | 'admin',
    reason: '',
  });
  const [createUserData, setCreateUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'customer' as 'customer' | 'mechanic' | 'admin',
    auto_verify: false,
  });
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; message: string; detail?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [detailDrawerUser, setDetailDrawerUser] = useState<Customer | null>(null);

  // Bulk selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'verify_email' | 'suspend' | 'reactivate' | 'delete' | null>(null);
  const [bulkReason, setBulkReason] = useState<string>('');
  const [bulkDuration, setBulkDuration] = useState<string>('7');

  // Impersonation state
  const [showImpersonateModal, setShowImpersonateModal] = useState<boolean>(false);
  const [impersonateCustomer, setImpersonateCustomer] = useState<Customer | null>(null);
  const [impersonateReason, setImpersonateReason] = useState<string>('');
  const [impersonateDuration, setImpersonateDuration] = useState<string>('30');

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

  function openAction(customer: Customer | null, action: 'notify' | 'reset' | 'suspend' | 'ban' | 'verify' | 'delete' | 'create' | 'change-role') {
    setActionCustomer(customer);
    setActiveAction(action);
    setActionStatus(null);
    setActionMessage('');
    setSuspendReason('');
    setSuspendDuration('7');
    setBanReason('');
    setDeleteReason('');
    setDeleteConfirmation('');
    setRoleChangeData({
      new_role: customer?.role as any || 'customer',
      reason: '',
    });
    setGeneratedPassword('');
    setMenuOpenId(null);
  }

  function closeAction() {
    setActionCustomer(null);
    setActiveAction(null);
    setActionStatus(null);
    setActionMessage('');
    setSuspendReason('');
    setSuspendDuration('7');
    setBanReason('');
    setDeleteReason('');
    setDeleteConfirmation('');
    setRoleChangeData({
      new_role: 'customer',
      reason: '',
    });
    setCreateUserData({
      email: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'customer',
      auto_verify: false,
    });
    setGeneratedPassword('');
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

  async function handleBanUser() {
    if (!actionCustomer) return;
    if (!banReason.trim()) {
      setActionStatus({ type: 'error', message: 'Ban reason is required.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: banReason.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to ban user (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: 'User banned permanently.',
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to ban user.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleVerifyEmail() {
    if (!actionCustomer) return;

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/verify-email`, {
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to verify email (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: 'Email verified successfully.',
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to verify email.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (!actionCustomer) return;
    if (!deleteReason.trim()) {
      setActionStatus({ type: 'error', message: 'Deletion reason is required.' });
      return;
    }
    if (deleteConfirmation !== 'DELETE') {
      setActionStatus({ type: 'error', message: 'Must type DELETE to confirm.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          reason: deleteReason.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to delete user (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: data?.message || 'User deleted successfully.',
        detail: data?.note,
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to delete user.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateUser() {
    if (!createUserData.email.trim() || !createUserData.full_name.trim()) {
      setActionStatus({ type: 'error', message: 'Email and full name are required.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUserData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to create user (status ${res.status})`);
      }

      if (data.generated_password) {
        setGeneratedPassword(data.generated_password);
      }

      setActionStatus({
        type: 'success',
        message: data?.message || 'User created successfully.',
        detail: data.generated_password ? `Generated password: ${data.generated_password}` : undefined,
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to create user.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeRole() {
    if (!actionCustomer) return;
    if (!roleChangeData.reason.trim()) {
      setActionStatus({ type: 'error', message: 'Reason is required.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await fetch(`/api/admin/users/${actionCustomer.id}/change-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleChangeData),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to change role (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: data?.message || 'Role changed successfully.',
      });
      await fetchCustomers();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to change role.' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReactivateUser(customer: Customer) {
    if (!confirm(`Reactivate ${customer.full_name || customer.email}? This will restore account access.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${customer.id}/set-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          reason: `Reactivated from ${customer.account_status} status`,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to reactivate user (status ${res.status})`);
      }

      alert(data?.message || 'Account reactivated successfully.');
      await fetchCustomers();
      setMenuOpenId(null);
    } catch (err: any) {
      alert(`Failed to reactivate: ${err?.message || 'Unknown error'}`);
    }
  }

  // Bulk selection handlers
  function toggleUserSelection(userId: string) {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  }

  function toggleSelectAll() {
    if (selectedUsers.size === rows.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(rows.map(r => r.id)));
    }
  }

  function clearSelection() {
    setSelectedUsers(new Set());
  }

  function openBulkAction(action: 'verify_email' | 'suspend' | 'reactivate' | 'delete') {
    setBulkAction(action);
    setBulkReason('');
    setBulkDuration('7');
    setActionStatus(null);
  }

  function closeBulkAction() {
    setBulkAction(null);
    setBulkReason('');
    setBulkDuration('7');
  }

  async function handleBulkAction() {
    if (!bulkAction) return;
    if (!bulkReason.trim()) {
      setActionStatus({ type: 'error', message: 'Reason is required for bulk actions.' });
      return;
    }

    if (selectedUsers.size === 0) {
      setActionStatus({ type: 'error', message: 'No users selected.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);

      const res = await fetch('/api/admin/users/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: Array.from(selectedUsers),
          action: bulkAction,
          reason: bulkReason.trim(),
          duration_days: bulkAction === 'suspend' ? parseInt(bulkDuration, 10) : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Bulk action failed (status ${res.status})`);
      }

      setActionStatus({
        type: 'success',
        message: `Bulk ${bulkAction} completed: ${data.results.success} succeeded, ${data.results.failed} failed`,
        detail: data.results.errors?.length > 0
          ? `Errors: ${data.results.errors.map((e: any) => e.error).join(', ')}`
          : undefined,
      });

      await fetchCustomers();
      clearSelection();
    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Bulk action failed.' });
    } finally {
      setActionLoading(false);
    }
  }

  // Impersonation handlers
  function openImpersonateModal(customer: Customer) {
    setImpersonateCustomer(customer);
    setImpersonateReason('');
    setImpersonateDuration('30');
    setShowImpersonateModal(true);
    setActionStatus(null);
    setMenuOpenId(null);
  }

  function closeImpersonateModal() {
    setShowImpersonateModal(false);
    setImpersonateCustomer(null);
    setImpersonateReason('');
    setImpersonateDuration('30');
  }

  async function handleImpersonate() {
    if (!impersonateCustomer) return;
    if (!impersonateReason.trim()) {
      setActionStatus({ type: 'error', message: 'Reason for impersonation is required.' });
      return;
    }

    try {
      setActionLoading(true);
      setActionStatus(null);

      const res = await fetch(`/api/admin/users/${impersonateCustomer.id}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: impersonateReason.trim(),
          duration_minutes: parseInt(impersonateDuration, 10),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Unable to start impersonation (status ${res.status})`);
      }

      // Store impersonation session in sessionStorage
      if (data.session) {
        sessionStorage.setItem('impersonation_session', JSON.stringify({
          session_id: data.session.id,
          admin_email: user?.email,
          target_user: data.session.target_user,
          expires_at: data.session.expires_at,
        }));
      }

      // Redirect to user's dashboard
      alert(`Impersonation session started. Redirecting to ${impersonateCustomer.role} dashboard...`);
      window.location.href = data.session.redirect_url;

    } catch (err: any) {
      setActionStatus({ type: 'error', message: err?.message || 'Failed to start impersonation.' });
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
      case 'ban':
        await handleBanUser();
        break;
      case 'verify':
        await handleVerifyEmail();
        break;
      case 'delete':
        await handleDeleteUser();
        break;
      case 'create':
        await handleCreateUser();
        break;
      case 'change-role':
        await handleChangeRole();
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
      : activeAction === 'ban'
      ? 'Ban User Permanently'
      : activeAction === 'verify'
      ? 'Verify Email'
      : activeAction === 'delete'
      ? 'Delete User'
      : activeAction === 'create'
      ? 'Create New User'
      : activeAction === 'change-role'
      ? 'Change User Role'
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
                onClick={() => openAction(null, 'create')}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 shadow-lg shadow-green-500/25 transition"
              >
                + Create User
              </button>
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

      {/* Bulk Actions Toolbar */}
      {selectedUsers.size > 0 && (
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-300">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-slate-400 underline hover:text-slate-300"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openBulkAction('verify_email')}
                className="rounded-lg bg-green-600/20 border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-300 hover:bg-green-600/30 transition"
              >
                Verify Email
              </button>
              <button
                onClick={() => openBulkAction('reactivate')}
                className="rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-600/30 transition"
              >
                Reactivate
              </button>
              <button
                onClick={() => openBulkAction('suspend')}
                className="rounded-lg bg-yellow-600/20 border border-yellow-500/30 px-3 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-600/30 transition"
              >
                Suspend
              </button>
              <button
                onClick={() => openBulkAction('delete')}
                className="rounded-lg bg-red-600/20 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-600/30 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <th className="w-12 px-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === rows.length && rows.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
                    />
                  </th>
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
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                      No customers found.
                    </td>
                  </tr>
                )}
                {rows.map((customer) => (
                  <tr key={customer.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-slate-700/50 transition">
                    <td className="w-12 px-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(customer.id)}
                        onChange={() => toggleUserSelection(customer.id)}
                        className="rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-2 focus:ring-orange-500"
                      />
                    </td>
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
                            onClick={() => { setDetailDrawerUser(customer); setMenuOpenId(null); }}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm font-medium text-orange-400 hover:bg-slate-700/60"
                          >
                            View Details
                          </button>
                          <div className="my-1 border-t border-slate-700"></div>
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
                            onClick={() => openAction(customer, 'change-role')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-blue-400 hover:bg-slate-700/60"
                          >
                            Change Role
                          </button>
                          {!customer.email_verified && (
                            <button
                              onClick={() => openAction(customer, 'verify')}
                              className="block w-full rounded-md px-2 py-2 text-left text-sm text-green-400 hover:bg-slate-700/60"
                            >
                              Verify Email
                            </button>
                          )}

                          {/* Impersonate - Only for non-admin users */}
                          {customer.role !== 'admin' && customer.account_status !== 'banned' && !customer.deleted_at && (
                            <button
                              onClick={() => openImpersonateModal(customer)}
                              className="block w-full rounded-md px-2 py-2 text-left text-sm text-purple-400 hover:bg-slate-700/60"
                            >
                              Impersonate User
                            </button>
                          )}

                          <div className="my-1 border-t border-slate-700"></div>

                          {/* Status Toggle - Reactivate for suspended/banned users */}
                          {(customer.account_status === 'suspended' || customer.account_status === 'banned') && (
                            <>
                              <button
                                onClick={() => handleReactivateUser(customer)}
                                className="block w-full rounded-md px-2 py-2 text-left text-sm font-medium text-green-400 hover:bg-slate-700/60"
                              >
                                ✓ Reactivate Account
                              </button>
                              <div className="my-1 border-t border-slate-700"></div>
                            </>
                          )}

                          {/* Status Actions - Only show for active users */}
                          {customer.account_status === 'active' && (
                            <>
                              <button
                                onClick={() => openAction(customer, 'suspend')}
                                className="block w-full rounded-md px-2 py-2 text-left text-sm text-yellow-400 hover:bg-slate-700/60"
                              >
                                Suspend Account
                              </button>
                              <button
                                onClick={() => openAction(customer, 'ban')}
                                className="block w-full rounded-md px-2 py-2 text-left text-sm text-red-400 hover:bg-slate-700/60"
                              >
                                Ban User
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => openAction(customer, 'delete')}
                            className="block w-full rounded-md px-2 py-2 text-left text-sm text-red-500 hover:bg-slate-700/60 font-medium"
                          >
                            Delete User
                          </button>
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

    {activeAction && (actionCustomer || activeAction === 'create') && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={closeAction}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">{actionTitle}</h3>
            {actionCustomer && (
              <p className="mt-1 text-xs text-slate-400">
                Acting on {actionCustomer.full_name || actionCustomer.email} ({actionCustomer.email})
              </p>
            )}
            {activeAction === 'create' && (
              <p className="mt-1 text-xs text-slate-400">
                Create a new user account (customer, mechanic, or admin)
              </p>
            )}

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

              {activeAction === 'ban' && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
                    Warning: This will permanently ban the user from the platform.
                  </div>
                  <label className="block text-xs font-medium text-slate-300">
                    Ban Reason (Required)
                    <textarea
                      value={banReason}
                      onChange={(event) => setBanReason(event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Explain why this account is being permanently banned."
                    />
                  </label>
                </div>
              )}

              {activeAction === 'verify' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">
                    This will manually verify the user's email address and allow them to access the platform.
                  </p>
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-200">
                    Click "Verify Email" to confirm this action.
                  </div>
                </div>
              )}

              {activeAction === 'delete' && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
                    Warning: This will soft-delete the user. Their data will be anonymized but retained for 7 days (PIPEDA compliance).
                  </div>
                  <label className="block text-xs font-medium text-slate-300">
                    Deletion Reason (Required)
                    <textarea
                      value={deleteReason}
                      onChange={(event) => setDeleteReason(event.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Explain why this account is being deleted."
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Type "DELETE" to confirm
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(event) => setDeleteConfirmation(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="DELETE"
                    />
                  </label>
                </div>
              )}

              {activeAction === 'create' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-300">
                    Email (Required)
                    <input
                      type="email"
                      value={createUserData.email}
                      onChange={(e) => setCreateUserData({...createUserData, email: e.target.value})}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="user@example.com"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Full Name (Required)
                    <input
                      type="text"
                      value={createUserData.full_name}
                      onChange={(e) => setCreateUserData({...createUserData, full_name: e.target.value})}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="John Smith"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Phone (Optional)
                    <input
                      type="tel"
                      value={createUserData.phone}
                      onChange={(e) => setCreateUserData({...createUserData, phone: e.target.value})}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Password (Optional - auto-generated if blank)
                    <input
                      type="password"
                      value={createUserData.password}
                      onChange={(e) => setCreateUserData({...createUserData, password: e.target.value})}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Leave blank to auto-generate"
                    />
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Role
                    <select
                      value={createUserData.role}
                      onChange={(e) => setCreateUserData({...createUserData, role: e.target.value as any})}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="mechanic">Mechanic</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={createUserData.auto_verify}
                      onChange={(e) => setCreateUserData({...createUserData, auto_verify: e.target.checked})}
                      className="rounded border-slate-700 bg-slate-800/60 text-green-500 focus:ring-2 focus:ring-green-500"
                    />
                    Auto-verify email
                  </label>
                </div>
              )}

              {activeAction === 'change-role' && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 text-sm text-blue-200">
                    Change user role between Customer, Mechanic, and Admin. This action is logged.
                  </div>
                  <label className="block text-xs font-medium text-slate-300">
                    New Role
                    <select
                      value={roleChangeData.new_role}
                      onChange={(e) => setRoleChangeData({...roleChangeData, new_role: e.target.value as any})}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="customer">Customer</option>
                      <option value="mechanic">Mechanic</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-300">
                    Reason (Required)
                    <textarea
                      value={roleChangeData.reason}
                      onChange={(e) => setRoleChangeData({...roleChangeData, reason: e.target.value})}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Explain why the role is being changed."
                    />
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
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    activeAction === 'delete' || activeAction === 'ban'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25'
                      : activeAction === 'verify' || activeAction === 'create'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/25'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/25'
                  }`}
                >
                  {actionLoading
                    ? 'Processing...'
                    : activeAction === 'notify'
                    ? 'Send Notification'
                    : activeAction === 'reset'
                    ? 'Generate Link'
                    : activeAction === 'suspend'
                    ? 'Suspend Account'
                    : activeAction === 'ban'
                    ? 'Ban User'
                    : activeAction === 'verify'
                    ? 'Verify Email'
                    : activeAction === 'delete'
                    ? 'Delete User'
                    : activeAction === 'create'
                    ? 'Create User'
                    : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      {bulkAction && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 px-4"
          onClick={closeBulkAction}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">
              Bulk {bulkAction === 'verify_email' ? 'Verify Email' : bulkAction === 'reactivate' ? 'Reactivate' : bulkAction === 'suspend' ? 'Suspend' : 'Delete'}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              This action will affect {selectedUsers.size} selected user{selectedUsers.size > 1 ? 's' : ''}
            </p>

            <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); handleBulkAction(); }}>
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

              <div className="space-y-3">
                {bulkAction === 'verify_email' && (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-200">
                    This will verify email addresses for all selected users.
                  </div>
                )}

                {bulkAction === 'reactivate' && (
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3 text-sm text-blue-200">
                    This will reactivate all selected users and restore access.
                  </div>
                )}

                {bulkAction === 'suspend' && (
                  <>
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-200">
                      This will suspend all selected users for the specified duration.
                    </div>
                    <label className="block text-xs font-medium text-slate-300">
                      Duration
                      <select
                        value={bulkDuration}
                        onChange={(e) => setBulkDuration(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-yellow-500"
                      >
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                      </select>
                    </label>
                  </>
                )}

                {bulkAction === 'delete' && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
                    Warning: This will soft-delete all selected users. Data will be anonymized and retained for 7 days.
                  </div>
                )}

                <label className="block text-xs font-medium text-slate-300">
                  Reason (Required)
                  <textarea
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Explain why this bulk action is being performed."
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeBulkAction}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    bulkAction === 'delete'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25'
                      : bulkAction === 'verify_email'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/25'
                      : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/25'
                  }`}
                >
                  {actionLoading ? 'Processing...' : `Execute Bulk ${bulkAction.replace('_', ' ')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Impersonation Modal */}
      {showImpersonateModal && impersonateCustomer && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-4"
          onClick={closeImpersonateModal}
        >
          <div
            className="w-full max-w-lg rounded-2xl border-2 border-purple-500/50 bg-slate-900/95 p-6 shadow-2xl backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-purple-500/20 p-2">
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Impersonate User</h3>
                <p className="text-xs text-slate-400">
                  {impersonateCustomer.full_name || impersonateCustomer.email} ({impersonateCustomer.role})
                </p>
              </div>
            </div>

            {/* Security Warnings */}
            <div className="space-y-3 mb-4">
              <div className="rounded-lg bg-red-500/10 border-2 border-red-500/50 p-4 text-sm">
                <div className="font-bold text-red-300 mb-2 flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  SECURITY WARNING
                </div>
                <ul className="space-y-1 text-red-200 text-xs list-disc list-inside">
                  <li>All actions during impersonation are <strong>LOGGED</strong></li>
                  <li>You cannot impersonate other administrators</li>
                  <li>Session expires after selected duration</li>
                  <li>Use only for legitimate troubleshooting</li>
                  <li>GDPR/Privacy compliance required</li>
                </ul>
              </div>

              <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-3 text-sm text-purple-200">
                <strong>What happens:</strong> You'll be redirected to the user's dashboard with their permissions.
                Use the "Exit Impersonation" banner to return to admin view.
              </div>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleImpersonate(); }}>
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

              <label className="block text-xs font-medium text-slate-300">
                Reason for Impersonation (Required)
                <textarea
                  value={impersonateReason}
                  onChange={(e) => setImpersonateReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Troubleshooting reported bug with order history..."
                  required
                />
              </label>

              <label className="block text-xs font-medium text-slate-300">
                Session Duration
                <select
                  value={impersonateDuration}
                  onChange={(e) => setImpersonateDuration(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="10">10 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes (default)</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes (max)</option>
                </select>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeImpersonateModal}
                  className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:from-purple-700 hover:to-purple-800 transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ? 'Starting...' : 'Start Impersonation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={detailDrawerUser}
        onClose={() => setDetailDrawerUser(null)}
        onAction={(action) => {
          if (detailDrawerUser) {
            openAction(detailDrawerUser, action as any);
            setDetailDrawerUser(null);
          }
        }}
      />
    </>
  );
}
