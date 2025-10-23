// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type CorporateBusiness = {
  id: string;
  company_name: string;
  company_email: string;
  business_type: string;
  subscription_tier: string;
  approval_status: string;
  is_active: boolean;
  created_at: string;
  fleet_size: number;
  current_month_sessions: number;
  monthly_session_limit: number;
  discount_percentage: number;
  primary_contact_name: string;
  primary_contact_email: string;
  assigned_account_manager_id: string;
  employee_count?: number;
  vehicle_count?: number;
};

type ApprovalAction = 'approve' | 'reject' | 'suspend';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-slate-100 text-slate-800',
};

const TIER_COLORS = {
  basic: 'bg-blue-100 text-blue-800',
  professional: 'bg-purple-100 text-purple-800',
  enterprise: 'bg-orange-100 text-orange-800',
  custom: 'bg-slate-100 text-slate-800',
};

export default function AdminCorporatePage() {
  const [businesses, setBusinesses] = useState<CorporateBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTier, setFilterTier] = useState('');
  const [search, setSearch] = useState('');

  // Modal states
  const [selectedBusiness, setSelectedBusiness] = useState<CorporateBusiness | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>('approve');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/corporate');

      if (!response.ok) {
        throw new Error('Failed to load corporate accounts');
      }

      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (err: any) {
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!selectedBusiness) return;

    try {
      const response = await fetch(`/api/admin/corporate/${selectedBusiness.id}/${approvalAction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${approvalAction} account`);
      }

      setShowApprovalModal(false);
      setSelectedBusiness(null);
      setRejectionReason('');
      fetchBusinesses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateInvoice = async (businessId: string) => {
    try {
      const response = await fetch(`/api/admin/corporate/${businessId}/generate-invoice`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const data = await response.json();
      alert(`Invoice ${data.invoice.invoice_number} generated successfully!`);
      fetchBusinesses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredBusinesses = businesses.filter((business) => {
    const matchesStatus = !filterStatus || business.approval_status === filterStatus;
    const matchesTier = !filterTier || business.subscription_tier === filterTier;
    const matchesSearch =
      !search ||
      business.company_name.toLowerCase().includes(search.toLowerCase()) ||
      business.company_email.toLowerCase().includes(search.toLowerCase()) ||
      business.primary_contact_name.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesTier && matchesSearch;
  });

  const stats = {
    total: businesses.length,
    pending: businesses.filter((b) => b.approval_status === 'pending').length,
    active: businesses.filter((b) => b.is_active).length,
    totalEmployees: businesses.reduce((sum, b) => sum + (b.employee_count || 0), 0),
    totalVehicles: businesses.reduce((sum, b) => sum + (b.vehicle_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading corporate accounts...</p>
        </div>
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
              <h1 className="text-xl font-semibold text-slate-800">Corporate Account Management</h1>
              <p className="text-sm text-slate-500">
                Manage B2B accounts, approve applications, and monitor usage
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
            >
              Admin Home
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-slate-600">Total Accounts</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-slate-600">Pending Approval</div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-slate-600">Active Accounts</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-slate-600">Total Employees</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEmployees}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-slate-600">Fleet Vehicles</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalVehicles}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Company name, email..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tier</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
              >
                <option value="">All Tiers</option>
                <option value="basic">Basic</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStatus('');
                  setFilterTier('');
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Type</th>
                  <th>Tier</th>
                  <th>Fleet</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBusinesses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No corporate accounts found
                    </td>
                  </tr>
                ) : (
                  filteredBusinesses.map((business) => (
                    <tr key={business.id} className="[&>td]:px-4 [&>td]:py-3 hover:bg-slate-50">
                      <td>
                        <div className="font-medium text-slate-900">{business.company_name}</div>
                        <div className="text-xs text-slate-500">{business.company_email}</div>
                      </td>
                      <td>
                        <div className="text-sm text-slate-900">{business.primary_contact_name}</div>
                        <div className="text-xs text-slate-500">{business.primary_contact_email}</div>
                      </td>
                      <td>
                        <span className="text-sm text-slate-600 capitalize">
                          {business.business_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          TIER_COLORS[business.subscription_tier as keyof typeof TIER_COLORS]
                        }`}>
                          {business.subscription_tier}
                        </span>
                      </td>
                      <td className="text-sm text-slate-900">
                        <div>{business.fleet_size} vehicles</div>
                        <div className="text-xs text-slate-500">{business.employee_count || 0} employees</div>
                      </td>
                      <td className="text-sm">
                        <div className="text-slate-900">
                          {business.current_month_sessions} / {business.monthly_session_limit || '∞'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {business.discount_percentage}% discount
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[business.approval_status as keyof typeof STATUS_COLORS]
                        }`}>
                          {business.approval_status}
                        </span>
                      </td>
                      <td className="text-sm text-slate-600 whitespace-nowrap">
                        {new Date(business.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {business.approval_status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setApprovalAction('approve');
                                  setShowApprovalModal(true);
                                }}
                                className="text-xs text-green-600 hover:underline text-left"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setApprovalAction('reject');
                                  setShowApprovalModal(true);
                                }}
                                className="text-xs text-red-600 hover:underline text-left"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {business.approval_status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleGenerateInvoice(business.id)}
                                className="text-xs text-orange-600 hover:underline text-left"
                              >
                                Generate Invoice
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBusiness(business);
                                  setApprovalAction('suspend');
                                  setShowApprovalModal(true);
                                }}
                                className="text-xs text-yellow-600 hover:underline text-left"
                              >
                                Suspend
                              </button>
                            </>
                          )}
                          <Link
                            href={`/admin/corporate/${business.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedBusiness && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">
              {approvalAction === 'approve' && 'Approve Corporate Account'}
              {approvalAction === 'reject' && 'Reject Application'}
              {approvalAction === 'suspend' && 'Suspend Account'}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                <strong>Company:</strong> {selectedBusiness.company_name}
              </p>
              <p className="text-sm text-slate-600 mb-2">
                <strong>Contact:</strong> {selectedBusiness.primary_contact_name}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Email:</strong> {selectedBusiness.company_email}
              </p>
            </div>

            {(approvalAction === 'reject' || approvalAction === 'suspend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason {approvalAction === 'reject' ? '(Optional)' : '(Required)'}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  placeholder={`Reason for ${approvalAction}ing this account...`}
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleApprovalSubmit}
                disabled={approvalAction === 'suspend' && !rejectionReason}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {approvalAction === 'approve' && 'Approve Account'}
                {approvalAction === 'reject' && 'Reject Application'}
                {approvalAction === 'suspend' && 'Suspend Account'}
              </button>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedBusiness(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
