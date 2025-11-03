'use client'

import { Plus, Trash2 } from 'lucide-react'
import CertificationTypeSelector from './CertificationTypeSelector'
import CertificationFields from './CertificationFields'
import type { CertificationType } from '@/lib/certifications/certTypes'

export interface CertificationEntry {
  id: string
  type: CertificationType | ''
  number: string
  authority: string
  region: string
  expiry: string
  document: File | null
}

interface MultipleCertificationsProps {
  certifications: CertificationEntry[]
  onChange: (certifications: CertificationEntry[]) => void
  provinces: string[]
  minRequired?: number
}

export default function MultipleCertifications({
  certifications = [],
  onChange,
  provinces,
  minRequired = 1,
}: MultipleCertificationsProps) {
  const addCertification = () => {
    const newCert: CertificationEntry = {
      id: Date.now().toString(),
      type: '',
      number: '',
      authority: '',
      region: '',
      expiry: '',
      document: null,
    }
    onChange([...certifications, newCert])
  }

  const removeCertification = (id: string) => {
    if (!certifications || certifications.length <= minRequired) {
      alert(`You must have at least ${minRequired} certification(s)`)
      return
    }
    onChange(certifications.filter((c) => c.id !== id))
  }

  const updateCertification = (id: string, updates: Partial<CertificationEntry>) => {
    if (!certifications) return
    onChange(
      certifications.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Professional Certifications</h3>
          <p className="text-sm text-slate-400">
            Add all your professional certifications. At least {minRequired} required.
          </p>
        </div>
        <button
          type="button"
          onClick={addCertification}
          className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 transition hover:border-orange-500/50 hover:bg-orange-500/20"
        >
          <Plus className="h-4 w-4" />
          Add Certification
        </button>
      </div>

      {(!certifications || certifications.length === 0) && (
        <div className="rounded-xl border border-white/10 bg-slate-800/40 p-8 text-center">
          <p className="text-sm text-slate-400">
            No certifications added yet. Click "Add Certification" to get started.
          </p>
        </div>
      )}

      {certifications && certifications.map((cert, index) => (
        <div
          key={cert.id}
          className="relative rounded-xl border border-white/10 bg-slate-800/40 p-6"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-400">
                {index + 1}
              </div>
              <h4 className="text-sm font-semibold text-white">
                {index === 0 ? 'Primary Certification' : `Certification #${index + 1}`}
              </h4>
              {index === 0 && (
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                  Primary
                </span>
              )}
            </div>
            {certifications.length > minRequired && (
              <button
                type="button"
                onClick={() => removeCertification(cert.id)}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-500/20"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>

          {/* Certification Type Selector */}
          <div className="mb-4">
            <CertificationTypeSelector
              value={cert.type}
              onChange={(type) => updateCertification(cert.id, { type })}
              label=""
              required
            />
          </div>

          {/* Certification Fields */}
          {cert.type && (
            <CertificationFields
              certificationType={cert.type}
              certificationNumber={cert.number}
              certificationAuthority={cert.authority}
              certificationRegion={cert.region}
              certificationExpiry={cert.expiry}
              certificationDocument={cert.document}
              onNumberChange={(number) => updateCertification(cert.id, { number })}
              onAuthorityChange={(authority) => updateCertification(cert.id, { authority })}
              onRegionChange={(region) => updateCertification(cert.id, { region })}
              onExpiryChange={(expiry) => updateCertification(cert.id, { expiry })}
              onDocumentChange={(document) => updateCertification(cert.id, { document })}
              provinces={provinces}
            />
          )}
        </div>
      ))}

      {certifications && certifications.length > 0 && (
        <p className="text-xs text-slate-400">
          💡 Tip: Your first certification will be displayed as your primary qualification. Add more to showcase your full expertise!
        </p>
      )}
    </div>
  )
}
