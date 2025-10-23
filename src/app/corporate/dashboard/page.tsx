// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CorporateAccount {
  id: string;
  company_name: string;
  business_type: string;
  subscription_tier: string;
  fleet_size: number;
  monthly_session_limit: number;
  current_month_sessions: number;
  discount_percentage: number;
}

interface Employee {
  id: string;
  employee_user_id: string;
  employee_role: string;
  employee_number: string;
  department: string;
  is_active: boolean;
  total_sessions: number;
  last_session_at: string;
  user: {
    email: string;
    full_name: string;
  };
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  assigned_to_employee_id: string;
  is_active: boolean;
  total_sessions: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_amount: number;
  sessions_count: number;
  status: string;
  due_date: string;
}

interface Session {
  id: string;
  created_at: string;
  status: string;
  type: string;
  employee: {
    full_name: string;
    email: string;
  };
  vehicle: {
    make: string;
    model: string;
    license_plate: string;
  };
}

export default function CorporateDashboardPage() {
  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'vehicles' | 'sessions' | 'billing'>('overview');

  // Add employee modal state
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('driver');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/corporate/dashboard');

      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const data = await response.json();
      setAccount(data.account);
      setEmployees(data.employees || []);
      setVehicles(data.vehicles || []);
      setInvoices(data.invoices || []);
      setSessions(data.sessions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/corporate/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmployeeEmail,
          role: newEmployeeRole,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add employee');
      }

      setShowAddEmployee(false);
      setNewEmployeeEmail('');
      setNewEmployeeRole('driver');
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee?')) {
      return;
    }

    try {
      const response = await fetch(`/api/corporate/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove employee');
      }

      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            {error || 'You do not have access to a corporate account.'}
          </p>
          <Link href="/" className="text-orange-600 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const usagePercentage = account.monthly_session_limit
    ? (account.current_month_sessions / account.monthly_session_limit) * 100
    : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{account.company_name}</h1>
              <p className="text-sm text-slate-600">
                {account.business_type} • {account.subscription_tier} Plan
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'employees', label: 'Employees' },
              { key: 'vehicles', label: 'Vehicles' },
              { key: 'sessions', label: 'Sessions' },
              { key: 'billing', label: 'Billing' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition ${
                  activeTab === tab.key
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-slate-600 mb-1">Active Employees</div>
                <div className="text-3xl font-bold text-slate-900">
                  {employees.filter((e) => e.is_active).length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  of {employees.length} total
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-slate-600 mb-1">Fleet Vehicles</div>
                <div className="text-3xl font-bold text-slate-900">
                  {vehicles.filter((v) => v.is_active).length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {account.fleet_size} registered
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-slate-600 mb-1">This Month</div>
                <div className="text-3xl font-bold text-slate-900">
                  {account.current_month_sessions}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  of {account.monthly_session_limit || 'Unlimited'} sessions
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-slate-600 mb-1">Discount</div>
                <div className="text-3xl font-bold text-orange-600">
                  {account.discount_percentage}%
                </div>
                <div className="text-xs text-slate-500 mt-1">off standard rates</div>
              </div>
            </div>

            {/* Usage Chart */}
            {account.monthly_session_limit && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Usage</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sessions used this month</span>
                    <span className="font-medium text-slate-900">
                      {account.current_month_sessions} / {account.monthly_session_limit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        usagePercentage > 90 ? 'bg-red-600' : usagePercentage > 75 ? 'bg-yellow-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {usagePercentage > 90 && 'Approaching limit - consider upgrading'}
                    {usagePercentage > 75 && usagePercentage <= 90 && 'High usage this month'}
                    {usagePercentage <= 75 && 'On track for this month'}
                  </p>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-slate-900">Recent Sessions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr className="[&>th]:px-6 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
                      <th>Date</th>
                      <th>Employee</th>
                      <th>Vehicle</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sessions.slice(0, 10).map((session) => (
                      <tr key={session.id} className="[&>td]:px-6 [&>td]:py-4">
                        <td className="text-sm text-slate-900">
                          {new Date(session.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-sm text-slate-900">
                          {session.employee?.full_name || 'Unknown'}
                        </td>
                        <td className="text-sm text-slate-600">
                          {session.vehicle
                            ? `${session.vehicle.make} ${session.vehicle.model}`
                            : 'N/A'}
                        </td>
                        <td className="text-sm text-slate-600 capitalize">{session.type}</td>
                        <td>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            session.status === 'completed' ? 'bg-green-100 text-green-800' :
                            session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Employee Management</h2>
              <button
                onClick={() => setShowAddEmployee(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
              >
                + Add Employee
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-6 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Sessions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="[&>td]:px-6 [&>td]:py-4">
                      <td className="text-sm font-medium text-slate-900">
                        {employee.user?.full_name || 'Unknown'}
                      </td>
                      <td className="text-sm text-slate-600">{employee.user?.email}</td>
                      <td className="text-sm text-slate-600 capitalize">{employee.employee_role}</td>
                      <td className="text-sm text-slate-600">{employee.department || 'N/A'}</td>
                      <td className="text-sm text-slate-900">{employee.total_sessions}</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          employee.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {employee.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {employee.is_active && (
                          <button
                            onClick={() => handleRemoveEmployee(employee.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Fleet Vehicles</h2>
              <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
                + Add Vehicle
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-slate-600">{vehicle.year}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {vehicle.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Fleet #:</span>
                      <span className="font-medium text-slate-900">{vehicle.vehicle_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">License:</span>
                      <span className="font-medium text-slate-900">{vehicle.license_plate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Sessions:</span>
                      <span className="font-medium text-slate-900">{vehicle.total_sessions}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Session History</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-6 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
                    <th>Date</th>
                    <th>Employee</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sessions.map((session) => (
                    <tr key={session.id} className="[&>td]:px-6 [&>td]:py-4">
                      <td className="text-sm text-slate-900">
                        {new Date(session.created_at).toLocaleString()}
                      </td>
                      <td className="text-sm text-slate-900">
                        {session.employee?.full_name || 'Unknown'}
                      </td>
                      <td className="text-sm text-slate-600">
                        {session.vehicle
                          ? `${session.vehicle.make} ${session.vehicle.model}`
                          : 'N/A'}
                      </td>
                      <td className="text-sm text-slate-600 capitalize">{session.type}</td>
                      <td className="text-sm text-slate-600">30 min</td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                      <td>
                        <button className="text-sm text-orange-600 hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Billing & Invoices</h2>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr className="[&>th]:px-6 [&>th]:py-3 [&>th]:text-left [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
                    <th>Invoice #</th>
                    <th>Billing Period</th>
                    <th>Sessions</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="[&>td]:px-6 [&>td]:py-4">
                      <td className="text-sm font-medium text-slate-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="text-sm text-slate-600">
                        {new Date(invoice.billing_period_start).toLocaleDateString()} -{' '}
                        {new Date(invoice.billing_period_end).toLocaleDateString()}
                      </td>
                      <td className="text-sm text-slate-900">{invoice.sessions_count}</td>
                      <td className="text-sm font-medium text-slate-900">
                        ${invoice.total_amount.toFixed(2)}
                      </td>
                      <td className="text-sm text-slate-600">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td>
                        <button className="text-sm text-orange-600 hover:underline">
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Add Employee</h3>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employee Email
                </label>
                <input
                  type="email"
                  value={newEmployeeEmail}
                  onChange={(e) => setNewEmployeeEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="employee@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={newEmployeeRole}
                  onChange={(e) => setNewEmployeeRole(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                >
                  <option value="driver">Driver</option>
                  <option value="fleet_manager">Fleet Manager</option>
                  <option value="admin">Admin</option>
                  <option value="technician">Technician</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  Add Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
