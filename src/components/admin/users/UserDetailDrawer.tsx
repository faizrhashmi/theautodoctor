'use client';

import { useState } from 'react';
import { X, User, Mail, Phone, Calendar, Activity, DollarSign, Shield, Clock } from 'lucide-react';

type UserDetail = {
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
};

type UserDetailDrawerProps = {
  user: UserDetail | null;
  onClose: () => void;
  onAction: (action: string) => void;
};

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    suspended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    banned: 'bg-red-500/20 text-red-400 border-red-500/30',
    deleted: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles[status as keyof typeof styles] || styles.active}`}>
      <span className="h-2 w-2 rounded-full bg-current"></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles = {
    customer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    mechanic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    admin: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[role as keyof typeof styles] || styles.customer}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

export default function UserDetailDrawer({ user, onClose, onAction }: UserDetailDrawerProps) {
  if (!user) return null;

  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const lastActive = user.last_active_at
    ? new Date(user.last_active_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Never';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-slate-900 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 p-6 backdrop-blur">
          <h2 className="text-xl font-semibold text-white">User Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {user.full_name || 'Unnamed User'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <RoleBadge role={user.role} />
                    <StatusBadge status={user.account_status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-300">{user.email}</span>
                {user.email_verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                    <Shield className="h-3 w-3" />
                    Verified
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">Not verified</span>
                )}
              </div>

              {user.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-300">{user.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">Joined:</span>
                <span className="text-slate-300">{joinDate}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-400">Last Active:</span>
                <span className="text-slate-300">{lastActive}</span>
              </div>
            </div>

            {/* Suspension/Ban Info */}
            {user.account_status === 'suspended' && user.suspended_until && (
              <div className="mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-200">
                <strong>Suspended until:</strong>{' '}
                {new Date(user.suspended_until).toLocaleString('en-US')}
              </div>
            )}

            {user.account_status === 'banned' && user.ban_reason && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-200">
                <strong>Ban reason:</strong> {user.ban_reason}
              </div>
            )}
          </div>

          {/* Activity Metrics */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h4 className="text-sm font-semibold text-white mb-4">Activity Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <Activity className="h-4 w-4" />
                  Total Sessions
                </div>
                <div className="text-2xl font-bold text-white">
                  {user.total_sessions || 0}
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Spent
                </div>
                <div className="text-2xl font-bold text-white">
                  ${(user.total_spent || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
            <h4 className="text-sm font-semibold text-white mb-4">Quick Actions</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => onAction('change-role')}
                className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition text-left"
              >
                <Shield className="h-4 w-4" />
                Change Role
              </button>

              <button
                onClick={() => onAction('reset')}
                className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition text-left"
              >
                <Mail className="h-4 w-4" />
                Reset Password
              </button>

              {!user.email_verified && (
                <button
                  onClick={() => onAction('verify')}
                  className="flex items-center gap-2 rounded-lg border border-green-600/50 bg-green-500/10 px-4 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/20 transition text-left"
                >
                  <Shield className="h-4 w-4" />
                  Verify Email
                </button>
              )}

              <div className="my-2 border-t border-slate-700"></div>

              <button
                onClick={() => onAction('suspend')}
                className="flex items-center gap-2 rounded-lg border border-yellow-600/50 bg-yellow-500/10 px-4 py-2.5 text-sm font-medium text-yellow-400 hover:bg-yellow-500/20 transition text-left"
              >
                <Clock className="h-4 w-4" />
                Suspend Account
              </button>

              <button
                onClick={() => onAction('ban')}
                className="flex items-center gap-2 rounded-lg border border-red-600/50 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition text-left"
              >
                <X className="h-4 w-4" />
                Ban User
              </button>

              <button
                onClick={() => onAction('delete')}
                className="flex items-center gap-2 rounded-lg border border-red-600/50 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/20 transition text-left font-semibold"
              >
                <X className="h-4 w-4" />
                Delete User
              </button>
            </div>
          </div>

          {/* User ID (for debugging) */}
          <div className="rounded-lg bg-slate-800/30 p-3 text-xs text-slate-500">
            <strong>User ID:</strong> {user.id}
          </div>
        </div>
      </div>
    </>
  );
}
