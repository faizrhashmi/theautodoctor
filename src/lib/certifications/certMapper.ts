/**
 * Certification Dual-Read/Write Helpers
 *
 * These functions handle reading and writing certification data using both:
 * - New generic fields (certification_*)
 * - Legacy Red Seal fields (red_seal_*)
 *
 * Strategy:
 * - READ: Prefer new fields, fallback to legacy
 * - WRITE: Dual-write to both new and legacy fields
 * - BACKWARD COMPATIBLE: Never break existing Red Seal queries
 */

import type {
  CertificationType,
  CertificationData,
  RedSealLegacyData,
  MechanicCertificationRow,
  CertificationUpdatePayload,
  CERTIFICATION_LABELS,
} from './certTypes'

/**
 * Read certification data from database row
 *
 * Strategy:
 * 1. If certification_type exists (new field), use canonical data
 * 2. Otherwise, check legacy red_seal_certified field
 * 3. Return null if no certification data found
 *
 * @param row - Database row with both new and legacy fields
 * @returns Canonical certification data or null
 */
export function readCertification(
  row: Partial<MechanicCertificationRow>
): CertificationData | null {
  // Prefer new canonical fields
  if (row.certification_type) {
    return {
      type: row.certification_type,
      number: row.certification_number || null,
      authority: row.certification_authority || null,
      region: row.certification_region || null,
      expiryDate: row.certification_expiry_date
        ? new Date(row.certification_expiry_date)
        : null,
    }
  }

  // Fallback to legacy Red Seal fields
  if (row.red_seal_certified === true) {
    return {
      type: 'red_seal',
      number: row.red_seal_number || null,
      authority: 'Red Seal Program',
      region: row.red_seal_province || null,
      expiryDate: row.red_seal_expiry_date
        ? new Date(row.red_seal_expiry_date)
        : null,
    }
  }

  // No certification data found
  return null
}

/**
 * Prepare certification data for database update (dual-write)
 *
 * Writes to BOTH:
 * - New canonical fields (certification_*)
 * - Legacy Red Seal fields (red_seal_*) if type is red_seal
 *
 * @param cert - Certification data to write
 * @returns Payload for database INSERT/UPDATE
 */
export function prepareCertificationUpdate(
  cert: CertificationData | null
): CertificationUpdatePayload {
  if (!cert) {
    // Clear all certification fields
    return {
      certification_type: null,
      certification_number: null,
      certification_authority: null,
      certification_region: null,
      certification_expiry_date: null,
      red_seal_certified: false,
      red_seal_number: null,
      red_seal_province: null,
      red_seal_expiry_date: null,
    }
  }

  const payload: CertificationUpdatePayload = {
    // Write to new canonical fields
    certification_type: cert.type,
    certification_number: cert.number,
    certification_authority: cert.authority,
    certification_region: cert.region,
    certification_expiry_date: cert.expiryDate?.toISOString().split('T')[0] || null,

    // Dual-write to legacy fields if Red Seal
    red_seal_certified: cert.type === 'red_seal',
    red_seal_number: cert.type === 'red_seal' ? cert.number : null,
    red_seal_province: cert.type === 'red_seal' ? cert.region : null,
    red_seal_expiry_date:
      cert.type === 'red_seal' && cert.expiryDate
        ? cert.expiryDate.toISOString().split('T')[0]
        : null,
  }

  return payload
}

/**
 * Check if mechanic is Red Seal certified
 *
 * Checks BOTH new and legacy fields for maximum compatibility
 *
 * @param row - Database row
 * @returns true if Red Seal certified
 */
export function isRedSealCertified(row: Partial<MechanicCertificationRow>): boolean {
  // Check new field first
  if (row.certification_type === 'red_seal') {
    return true
  }

  // Fallback to legacy field
  return row.red_seal_certified === true
}

/**
 * Check if mechanic has ANY valid certification
 *
 * @param row - Database row
 * @returns true if certified
 */
export function isCertified(row: Partial<MechanicCertificationRow>): boolean {
  return readCertification(row) !== null
}

/**
 * Get human-readable certification label
 *
 * @param row - Database row
 * @returns Label like "Red Seal Certified", "Provincial Journeyperson", etc.
 */
export function getCertificationLabel(row: Partial<MechanicCertificationRow>): string | null {
  const cert = readCertification(row)
  if (!cert) return null

  const labels: Record<CertificationType, string> = {
    red_seal: 'Red Seal Certified',
    provincial: 'Provincial Journeyperson',
    ase: 'ASE Certified',
    cpa_quebec: 'CPA Quebec Certified',
    manufacturer: 'Manufacturer Specialist',
    other: 'Certified Technician',
  }

  return labels[cert.type]
}

/**
 * Get short certification badge text
 *
 * @param row - Database row
 * @returns Short badge text like "Red Seal", "ASE", "Provincial"
 */
export function getCertificationBadge(row: Partial<MechanicCertificationRow>): string | null {
  const cert = readCertification(row)
  if (!cert) return null

  const badges: Record<CertificationType, string> = {
    red_seal: 'Red Seal',
    provincial: 'Provincial',
    ase: 'ASE',
    cpa_quebec: 'CPA Quebec',
    manufacturer: 'Specialist',
    other: 'Certified',
  }

  return badges[cert.type]
}

/**
 * Map legacy Red Seal data to canonical format
 *
 * Useful for data migration and backfill
 *
 * @param legacy - Legacy Red Seal data
 * @returns Canonical certification data
 */
export function mapLegacyToCanonical(legacy: RedSealLegacyData): CertificationData | null {
  if (!legacy.certified) {
    return null
  }

  return {
    type: 'red_seal',
    number: legacy.number,
    authority: 'Red Seal Program',
    region: legacy.province,
    expiryDate: legacy.expiryDate,
  }
}

/**
 * Validate certification type
 *
 * @param type - String to validate
 * @returns true if valid certification type
 */
export function isValidCertificationType(type: string): type is CertificationType {
  const validTypes: CertificationType[] = [
    'red_seal',
    'provincial',
    'ase',
    'cpa_quebec',
    'manufacturer',
    'other',
  ]
  return validTypes.includes(type as CertificationType)
}

/**
 * Format certification number for display
 *
 * Examples:
 * - "RS-ON-12345678" → "RS-ON-12345678" (Red Seal)
 * - "123456" → "#123456" (Provincial)
 * - "A1" → "ASE A1" (ASE)
 *
 * @param cert - Certification data
 * @returns Formatted number or null
 */
export function formatCertificationNumber(cert: CertificationData | null): string | null {
  if (!cert || !cert.number) return null

  switch (cert.type) {
    case 'red_seal':
      return cert.number // Already formatted (e.g., "RS-ON-12345678")

    case 'provincial':
      return `#${cert.number}`

    case 'ase':
      // ASE numbers like "A1", "A4" - prefix with "ASE" if not already
      return cert.number.startsWith('ASE') ? cert.number : `ASE ${cert.number}`

    case 'cpa_quebec':
      return `CPA ${cert.number}`

    case 'manufacturer':
      return cert.number // e.g., "Honda Master", "Toyota Level 2"

    case 'other':
      return cert.number

    default:
      return cert.number
  }
}

/**
 * Check if certification is expired
 *
 * @param cert - Certification data
 * @returns true if expired
 */
export function isCertificationExpired(cert: CertificationData | null): boolean {
  if (!cert || !cert.expiryDate) {
    return false // No expiry date = never expires
  }

  return cert.expiryDate < new Date()
}

/**
 * Get days until certification expires
 *
 * @param cert - Certification data
 * @returns Number of days until expiry (negative if expired, null if no expiry)
 */
export function getDaysUntilExpiry(cert: CertificationData | null): number | null {
  if (!cert || !cert.expiryDate) return null

  const now = new Date()
  const diffMs = cert.expiryDate.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return diffDays
}
