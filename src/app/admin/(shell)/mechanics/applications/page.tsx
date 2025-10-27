// @ts-nocheck
'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Download,
  Eye,
  AlertCircle,
  Search,
  User,
  Award,
  Shield,
  Building2,
} from 'lucide-react';

interface MechanicApplication {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  application_status: string;
  background_check_status: string;
  application_submitted_at: string;

  // Personal
  full_address: string;
  city: string;
  province: string;
  date_of_birth: string;

  // Credentials
  red_seal_certified: boolean;
  red_seal_number: string | null;
  red_seal_province: string | null;
  years_of_experience: number;
  specializations: string[];

  // Shop
  shop_affiliation: string;
  shop_name: string | null;
  shop_address: string | null;

  // Insurance
  liability_insurance: boolean;
  insurance_policy_number: string;
  insurance_expiry: string;

  // Documents
  certification_documents: string[];
  business_license_document: string | null;
  insurance_document: string | null;
  crc_document: string | null;
}

export default function MechanicApplicationsPage() {
  const [applications, setApplications] = useState<MechanicApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<MechanicApplication | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/mechanics/applications?status=${filter}`);
      const data = await res.json();
      if (res.ok) {
        setApplications(data.applications || []);
      }
    } catch (e) {
      console.error('Failed to load applications:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'request_info',
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/mechanics/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        await loadApplications();
        setSelectedApp(null);
        alert(`Application ${action}d successfully`);
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (e) {
      console.error('Action failed:', e);
      alert('Action failed');
    }
  };

  const filteredApplications = applications.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    pending: applications.filter((a) => a.application_status === 'pending').length,
    under_review: applications.filter((a) => a.application_status === 'under_review').length,
    approved: applications.filter((a) => a.application_status === 'approved').length,
    rejected: applications.filter((a) => a.application_status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Mechanic Applications</h1>
        <p className="mt-1 text-sm text-slate-400">Review and approve mechanic applications</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="orange"
          active={filter === 'pending'}
          onClick={() => setFilter('pending')}
        />
        <StatCard
          label="Under Review"
          value={stats.under_review}
          icon={Eye}
          color="blue"
          active={filter === 'under_review'}
          onClick={() => setFilter('under_review')}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          color="green"
          active={filter === 'approved'}
          onClick={() => setFilter('approved')}
        />
        <StatCard
          label="Rejected"
          value={stats.rejected}
          icon={XCircle}
          color="red"
          active={filter === 'rejected'}
          onClick={() => setFilter('rejected')}
        />
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-2 text-sm text-slate-400">Loading applications...</p>
          </div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm font-medium text-white">No applications found</p>
          <p className="mt-1 text-sm text-slate-400">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onView={() => setSelectedApp(app)}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <ApplicationDetailModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border-2 p-4 text-left transition ${
        active ? colors[color as keyof typeof colors] : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${active ? '' : 'text-slate-400'}`} />
      </div>
    </button>
  );
}

function ApplicationCard({
  application,
  onView,
}: {
  application: MechanicApplication;
  onView: () => void;
}) {
  const statusColors = {
    pending: 'bg-orange-100 text-orange-700',
    under_review: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    additional_info_required: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{application.name}</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[application.application_status as keyof typeof statusColors]
              }`}
            >
              {application.application_status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <div className="mt-2 space-y-1 text-sm text-slate-400">
            <p>{application.email}</p>
            <p>{application.phone}</p>
            <p>
              {application.city}, {application.province}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400">{application.years_of_experience} years exp</span>
            </div>
            {application.red_seal_certified && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-slate-400">Red Seal Certified</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 capitalize">{application.shop_affiliation}</span>
            </div>
            {application.liability_insurance && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-slate-400">Insured</span>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Submitted: {new Date(application.application_submitted_at).toLocaleDateString()}
          </div>
        </div>

        <button
          onClick={onView}
          className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
        >
          <Eye className="h-4 w-4" />
          Review
        </button>
      </div>
    </div>
  );
}

function ApplicationDetailModal({
  application,
  onClose,
  onAction,
}: {
  application: MechanicApplication;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'reject' | 'request_info', notes?: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{application.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{application.email}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-400"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <Section icon={User} title="Personal Information">
            <InfoRow label="Full Name" value={application.name} />
            <InfoRow label="Email" value={application.email} />
            <InfoRow label="Phone" value={application.phone} />
            <InfoRow label="Address" value={application.full_address} />
            <InfoRow label="Date of Birth" value={application.date_of_birth} />
          </Section>

          {/* Credentials */}
          <Section icon={Award} title="Credentials & Certifications">
            <InfoRow label="Years of Experience" value={application.years_of_experience.toString()} />
            <InfoRow label="Specializations" value={application.specializations.join(', ')} />
            <InfoRow label="Red Seal Certified" value={application.red_seal_certified ? 'Yes' : 'No'} />
            {application.red_seal_certified && (
              <>
                <InfoRow label="Red Seal Number" value={application.red_seal_number || 'N/A'} />
                <InfoRow label="Province" value={application.red_seal_province || 'N/A'} />
              </>
            )}
          </Section>

          {/* Shop Information */}
          <Section icon={Building2} title="Shop Information">
            <InfoRow
              label="Work Arrangement"
              value={application.shop_affiliation?.charAt(0).toUpperCase() + application.shop_affiliation?.slice(1)}
            />
            {application.shop_name && <InfoRow label="Shop Name" value={application.shop_name} />}
            {application.shop_address && <InfoRow label="Shop Address" value={application.shop_address} />}
          </Section>

          {/* Insurance & Background */}
          <Section icon={Shield} title="Insurance & Background">
            <InfoRow label="Liability Insurance" value={application.liability_insurance ? 'Yes' : 'No'} />
            <InfoRow label="Policy Number" value={application.insurance_policy_number} />
            <InfoRow label="Insurance Expiry" value={application.insurance_expiry} />
          </Section>

          {/* Documents */}
          <Section icon={FileText} title="Documents">
            <div className="space-y-2">
              {application.certification_documents?.map((doc, idx) => (
                <DocumentLink key={idx} label={`Red Seal Certificate ${idx + 1}`} url={doc} />
              ))}
              {application.business_license_document && (
                <DocumentLink label="Business License" url={application.business_license_document} />
              )}
              {application.insurance_document && (
                <DocumentLink label="Insurance Certificate" url={application.insurance_document} />
              )}
              {application.crc_document && (
                <DocumentLink label="Criminal Record Check" url={application.crc_document} />
              )}
            </div>
          </Section>

          {/* Action Section */}
          {application.application_status === 'pending' ||
          application.application_status === 'under_review' ? (
            <div className="rounded-lg border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
              <h3 className="font-semibold text-white">Take Action</h3>
              <p className="mt-1 text-sm text-slate-400">Review the application and take action</p>

              <div className="mt-4 space-y-4">
                <textarea
                  placeholder="Add notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 p-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  rows={3}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => onAction(application.id, 'approve', notes)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => onAction(application.id, 'reject', notes)}
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => onAction(application.id, 'request_info', notes)}
                    className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Request Info
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-700 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-center">
              <p className="text-sm text-slate-400">
                This application has been {application.application_status}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-700 p-6">
      <div className="mb-4 flex items-center gap-3">
        <Icon className="h-5 w-5 text-orange-600" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}:</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function DocumentLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-3 text-sm transition hover:border-orange-500 hover:bg-orange-50"
    >
      <span className="font-medium text-white">{label}</span>
      <div className="flex gap-2">
        <Eye className="h-4 w-4 text-slate-400" />
        <Download className="h-4 w-4 text-slate-400" />
      </div>
    </a>
  );
}
