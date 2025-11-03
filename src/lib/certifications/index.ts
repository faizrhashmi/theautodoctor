/**
 * Certification Management Library
 *
 * Provides dual-read/write helpers for handling mechanic certifications.
 * Supports both new generic certification fields and legacy Red Seal fields.
 */

// Export types
export type {
  CertificationType,
  CertificationData,
  RedSealLegacyData,
  MechanicCertificationRow,
  CertificationUpdatePayload,
} from './certTypes'

export {
  CERTIFICATION_LABELS,
  CERTIFICATION_AUTHORITIES,
  CANADIAN_PROVINCES,
} from './certTypes'

// Export helper functions
export {
  readCertification,
  prepareCertificationUpdate,
  isRedSealCertified,
  isCertified,
  getCertificationLabel,
  getCertificationBadge,
  mapLegacyToCanonical,
  isValidCertificationType,
  formatCertificationNumber,
  isCertificationExpired,
  getDaysUntilExpiry,
} from './certMapper'
