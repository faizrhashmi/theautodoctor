'use client'

import type { CertificationType } from '@/lib/certifications/certTypes'

interface CertificationFieldsProps {
  certificationType: CertificationType | ''
  certificationNumber: string
  certificationAuthority: string
  certificationRegion: string
  certificationExpiry: string
  certificationDocument: File | null
  onNumberChange: (value: string) => void
  onAuthorityChange: (value: string) => void
  onRegionChange: (value: string) => void
  onExpiryChange: (value: string) => void
  onDocumentChange: (file: File | null) => void
  provinces: string[]
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
]

export default function CertificationFields({
  certificationType,
  certificationNumber,
  certificationAuthority,
  certificationRegion,
  certificationExpiry,
  certificationDocument,
  onNumberChange,
  onAuthorityChange,
  onRegionChange,
  onExpiryChange,
  onDocumentChange,
  provinces,
}: CertificationFieldsProps) {
  if (!certificationType) return null

  const renderFields = () => {
    switch (certificationType) {
      case 'red_seal':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Red Seal Certificate Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="RS-ON-12345678"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Province Issued <span className="text-red-400">*</span>
                </label>
                <select
                  value={certificationRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                >
                  <option value="">Select province</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  value={certificationExpiry}
                  onChange={(e) => onExpiryChange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Upload Certificate <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onDocumentChange(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-orange-600"
                  required
                />
              </div>
            </div>
          </>
        )

      case 'provincial':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Certificate Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="Certificate number"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Province <span className="text-red-400">*</span>
                </label>
                <select
                  value={certificationRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                >
                  <option value="">Select province</option>
                  {provinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Issuing Authority <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationAuthority}
                  onChange={(e) => onAuthorityChange(e.target.value)}
                  placeholder="e.g., Ontario College of Trades"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Upload Certificate <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onDocumentChange(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-orange-600"
                  required
                />
              </div>
            </div>
          </>
        )

      case 'ase':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  ASE Certification ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="ASE ID number"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  State <span className="text-red-400">*</span>
                </label>
                <select
                  value={certificationRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                >
                  <option value="">Select state</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Specialty Area
                </label>
                <input
                  type="text"
                  value={certificationAuthority}
                  onChange={(e) => onAuthorityChange(e.target.value)}
                  placeholder="e.g., A1 Engine Repair"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Upload Certificate <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onDocumentChange(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-orange-600"
                  required
                />
              </div>
            </div>
          </>
        )

      case 'cpa_quebec':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  CPA Quebec Permit Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="Permit number"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Upload Certificate <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onDocumentChange(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-orange-600"
                  required
                />
              </div>
            </div>
          </>
        )

      case 'manufacturer':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Brand/Manufacturer <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationAuthority}
                  onChange={(e) => onAuthorityChange(e.target.value)}
                  placeholder="e.g., Honda, Toyota, Ford"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Certification Level/Number
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="e.g., Master Technician"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  value={certificationExpiry}
                  onChange={(e) => onExpiryChange(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Upload Certificate <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onDocumentChange(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-orange-600"
                  required
                />
              </div>
            </div>
          </>
        )

      case 'other':
        return (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Certification Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationAuthority}
                  onChange={(e) => onAuthorityChange(e.target.value)}
                  placeholder="Name of certification"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={certificationNumber}
                  onChange={(e) => onNumberChange(e.target.value)}
                  placeholder="Certificate number (if applicable)"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Issuing Body <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={certificationRegion}
                  onChange={(e) => onRegionChange(e.target.value)}
                  placeholder="Organization that issued certification"
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Upload Certificate <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => onDocumentChange(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-white/10 bg-slate-700 px-4 py-2.5 text-white file:mr-4 file:rounded file:border-0 file:bg-orange-500 file:px-4 file:py-1 file:text-sm file:text-white hover:file:bg-orange-600"
                  required
                />
              </div>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-slate-800/40 p-6">
      <h3 className="text-sm font-semibold text-white">Certification Details</h3>
      {renderFields()}
    </div>
  )
}
