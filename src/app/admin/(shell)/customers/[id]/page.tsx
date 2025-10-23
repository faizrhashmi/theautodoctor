// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

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
  vehicle_info?: any;
  metadata?: any;
  total_sessions?: number;
  total_spent?: number;
};

type AdminNote = {
  id: string;
  created_at: string;
  admin_email: string;
  note: string;
};

type AdminAction = {
  id: string;
  created_at: string;
  admin_email: string;
  action_type: string;
  reason?: string | null;
  duration_days?: number | null;
};

type ActionModalProps = {
  type: 'suspend' | 'ban' | 'verify' | 'reset' | 'notify';
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
};

function ActionModal({ type, userId, onClose, onSuccess }: ActionModalProps) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('7');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const titles = {
    suspend: 'Suspend Account',
    ban: 'Ban Account',
    verify: 'Verify Email',
    reset: 'Send Password Reset',
    notify: 'Send Notification',
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let endpoint = '';
      let body: any = {};

      switch (type) {
        case 'suspend':
          endpoint = `/api/admin/users/${userId}/suspend`;
          body = { reason, duration_days: parseInt(duration) };
          break;
        case 'ban':
          endpoint = `/api/admin/users/${userId}/ban`;
          body = { reason };
          break;
        case 'verify':
          endpoint = `/api/admin/users/${userId}/verify-email`;
          break;
        case 'reset':
          endpoint = `/api/admin/users/${userId}/reset-password`;
          break;
        case 'notify':
          endpoint = `/api/admin/users/${userId}/notify`;
          body = { message };
          break;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">{titles[type]}</h3>

        <form onSubmit={handleSubmit}>
          {(type === 'suspend' || type === 'ban') && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                placeholder="Explain why this action is being taken..."
              />
            </div>
          )}

          {type === 'suspend' && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Duration (days)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                min="1"
                max="365"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {type === 'notify' && (
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                placeholder="Enter notification message..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [activeModal, setActiveModal] = useState<ActionModalProps['type'] | null>(null);

  async function fetchCustomer() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${customerId}`);
      if (!res.ok) throw new Error('Failed to load customer');
      const data = await res.json();
      setCustomer(data.user);
      setNotes(data.notes || []);
      setActions(data.actions || []);
    } catch (err: any) {
      } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/users/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNewNote('');
      fetchCustomer();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingNote(false);
    }
  }

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-600">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-2">
                <Link href="/admin/customers" className="text-sm text-orange-600 hover:underline">
                  ← Back to Customers
                </Link>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">
                {customer.full_name || 'Unnamed Customer'}
              </h1>
              <p className="text-sm text-slate-500">{customer.email}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveModal('notify')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Profile & Stats */}
          <div className="space-y-6 lg:col-span-2">
            {/* Profile Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Email</div>
                  <div className="mt-1 text-slate-900">{customer.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Phone</div>
                  <div className="mt-1 text-slate-900">{customer.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Account Status</div>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      customer.account_status === 'active' ? 'bg-green-100 text-green-800' :
                      customer.account_status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {customer.account_status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Email Verified</div>
                  <div className="mt-1 text-slate-900">{customer.email_verified ? 'Yes' : 'No'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Joined</div>
                  <div className="mt-1 text-slate-900">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Last Active</div>
                  <div className="mt-1 text-slate-900">
                    {customer.last_active_at ? new Date(customer.last_active_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-500">Total Sessions</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">{customer.total_sessions || 0}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-500">Total Spent</div>
                <div className="mt-2 text-3xl font-bold text-slate-900">${(customer.total_spent || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Admin Notes</h2>

              <div className="mb-4">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={addNote}
                  disabled={!newNote.trim() || addingNote}
                  className="mt-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>

              <div className="space-y-3">
                {notes.length === 0 && (
                  <p className="text-sm text-slate-500">No notes yet</p>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">{note.admin_email}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-900">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Actions & History */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
              <div className="space-y-2">
                {customer.account_status === 'active' && (
                  <button
                    onClick={() => setActiveModal('suspend')}
                    className="w-full rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
                  >
                    Suspend Account
                  </button>
                )}
                {customer.account_status !== 'banned' && (
                  <button
                    onClick={() => setActiveModal('ban')}
                    className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Ban Account
                  </button>
                )}
                {!customer.email_verified && (
                  <button
                    onClick={() => setActiveModal('verify')}
                    className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100"
                  >
                    Verify Email
                  </button>
                )}
                <button
                  onClick={() => setActiveModal('reset')}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Send Password Reset
                </button>
              </div>
            </div>

            {/* Action History */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Action History</h2>
              <div className="space-y-3">
                {actions.length === 0 && (
                  <p className="text-sm text-slate-500">No actions yet</p>
                )}
                {actions.map((action) => (
                  <div key={action.id} className="border-l-2 border-orange-500 pl-3">
                    <div className="text-sm font-medium text-slate-900">{action.action_type}</div>
                    <div className="text-xs text-slate-600">{action.admin_email}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(action.created_at).toLocaleString()}
                    </div>
                    {action.reason && (
                      <div className="mt-1 text-sm text-slate-700">{action.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {activeModal && (
        <ActionModal
          type={activeModal}
          userId={customerId}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            fetchCustomer();
          }}
        />
      )}
    </div>
  );
}
