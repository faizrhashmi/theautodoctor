// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  bio?: string | null;
  created_at: string;
  last_active_at?: string | null;
  suspended_until?: string | null;
  ban_reason?: string | null;
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
  metadata?: any;
};

export default function MechanicDetailPage() {
  const params = useParams();
  const mechanicId = params.id as string;

  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [approving, setApproving] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [adjustingRating, setAdjustingRating] = useState(false);
  const [newRating, setNewRating] = useState('');

  async function fetchMechanic() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/mechanics/${mechanicId}`);
      if (!res.ok) throw new Error('Failed to load mechanic');
      const data = await res.json();
      setMechanic(data.mechanic);
      setNotes(data.notes || []);
      setActions(data.actions || []);
      setNewRating(data.mechanic.rating?.toString() || '0');
    } catch (err: any) {
      } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/users/${mechanicId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      setNewNote('');
      fetchMechanic();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingNote(false);
    }
  }

  async function handleApprove() {
    if (!confirm('Approve this mechanic?')) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/admin/users/mechanics/${mechanicId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to approve');
      fetchMechanic();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setApproving(false);
    }
  }

  async function handleSuspend() {
    const reason = prompt('Reason for suspension:');
    if (!reason) return;
    const days = prompt('Duration in days:', '7');
    if (!days) return;

    setSuspending(true);
    try {
      const res = await fetch(`/api/admin/users/${mechanicId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, duration_days: parseInt(days) }),
      });
      if (!res.ok) throw new Error('Failed to suspend');
      fetchMechanic();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSuspending(false);
    }
  }

  async function handleAdjustRating() {
    const rating = parseFloat(newRating);
    if (isNaN(rating) || rating < 0 || rating > 5) {
      alert('Rating must be between 0 and 5');
      return;
    }

    setAdjustingRating(true);
    try {
      const res = await fetch(`/api/admin/users/mechanics/${mechanicId}/adjust-rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) throw new Error('Failed to adjust rating');
      fetchMechanic();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdjustingRating(false);
    }
  }

  useEffect(() => {
    fetchMechanic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanicId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!mechanic) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-600">Mechanic not found</div>
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
                <Link href="/admin/mechanics" className="text-sm text-orange-600 hover:underline">
                  ← Back to Mechanics
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-slate-800">
                  {mechanic.name || 'Unnamed Mechanic'}
                </h1>
                <div className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${mechanic.is_online ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <span className="text-xs text-slate-600">{mechanic.is_online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <p className="text-sm text-slate-500">{mechanic.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Profile Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Email</div>
                  <div className="mt-1 text-slate-900">{mechanic.email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Phone</div>
                  <div className="mt-1 text-slate-900">{mechanic.phone || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Account Status</div>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      mechanic.account_status === 'active' ? 'bg-green-100 text-green-800' :
                      mechanic.account_status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {mechanic.account_status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Approval Status</div>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      mechanic.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                      mechanic.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {mechanic.approval_status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Joined</div>
                  <div className="mt-1 text-slate-900">
                    {new Date(mechanic.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500">Last Active</div>
                  <div className="mt-1 text-slate-900">
                    {mechanic.last_active_at ? new Date(mechanic.last_active_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
              </div>

              {mechanic.bio && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-500">Bio</div>
                  <div className="mt-1 text-slate-900">{mechanic.bio}</div>
                </div>
              )}

              {mechanic.specializations && mechanic.specializations.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-500">Specializations</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mechanic.specializations.map((spec, idx) => (
                      <span key={idx} className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Rating</div>
                <div className="mt-2 flex items-center gap-1">
                  <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-2xl font-bold text-slate-900">{mechanic.rating.toFixed(2)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Total Sessions</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{mechanic.total_sessions}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Earnings</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">${mechanic.total_earnings.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Avg Response</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {mechanic.avg_response_time ? `${Math.floor(mechanic.avg_response_time / 60)}m` : 'N/A'}
                </div>
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

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
              <div className="space-y-2">
                {mechanic.approval_status === 'pending' && (
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    {approving ? 'Approving...' : 'Approve Mechanic'}
                  </button>
                )}
                {mechanic.account_status === 'active' && (
                  <button
                    onClick={handleSuspend}
                    disabled={suspending}
                    className="w-full rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                  >
                    {suspending ? 'Suspending...' : 'Suspend Account'}
                  </button>
                )}
              </div>
            </div>

            {/* Adjust Rating */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Adjust Rating</h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">New Rating (0-5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.01"
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  onClick={handleAdjustRating}
                  disabled={adjustingRating}
                  className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {adjustingRating ? 'Adjusting...' : 'Update Rating'}
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
    </div>
  );
}
