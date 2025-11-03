/**
 * Certification Type Definitions
 *
 * Defines all certification types supported by the platform.
 * Used for dual-read/write helpers and type-safe certification handling.
 */

/**
 * All supported certification types
 */
export type CertificationType =
  | 'red_seal'        // Red Seal (Interprovincial Certificate of Qualification)
  | 'provincial'      // Provincial Journeyman/Journeyperson
  | 'ase'             // ASE (Automotive Service Excellence) - US
  | 'cpa_quebec'      // Corporation des Maîtres Mécaniciens en Véhicules Routiers du Québec
  | 'manufacturer'    // Manufacturer specialist (Honda Master, Toyota Level 2, etc.)
  | 'other'           // Other recognized certifications

/**
 * Human-readable labels for certification types
 */
export const CERTIFICATION_LABELS: Record<CertificationType, string> = {
  red_seal: 'Red Seal Certified',
  provincial: 'Provincial Journeyperson',
  ase: 'ASE Certified',
  cpa_quebec: 'CPA Quebec Certified',
  manufacturer: 'Manufacturer Specialist',
  other: 'Certified Technician',
}

/**
 * Certification authority examples for each type
 */
export const CERTIFICATION_AUTHORITIES: Record<CertificationType, string[]> = {
  red_seal: [
    'Red Seal Program',
    'Interprovincial Standards Red Seal Program',
  ],
  provincial: [
    'Ontario College of Trades',
    'Skilled Trades BC',
    'Apprenticeship and Trade Certification Commission (Quebec)',
    'Alberta Apprenticeship and Industry Training',
  ],
  ase: [
    'ASE (Automotive Service Excellence)',
    'National Institute for Automotive Service Excellence',
  ],
  cpa_quebec: [
    'CPA Montreal',
    'Corporation des Maîtres Mécaniciens en Véhicules Routiers du Québec',
  ],
  manufacturer: [
    'Honda',
    'Toyota',
    'Ford',
    'General Motors',
    'FCA (Chrysler)',
    'Mercedes-Benz',
    'BMW',
    'Volkswagen',
    'Mazda',
    'Nissan',
  ],
  other: [],
}

/**
 * Canadian provinces and territories (for certification_region)
 */
export const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
  { code: 'CA', name: 'Canada (Interprovincial)' }, // For Red Seal
] as const

/**
 * Certification data structure (canonical format)
 */
export interface CertificationData {
  /** Type of certification */
  type: CertificationType

  /** Certification/license number */
  number: string | null

  /** Issuing authority (e.g., "Red Seal Program", "Ontario College of Trades") */
  authority: string | null

  /** Province/state of certification (e.g., "ON", "QC", "CA") */
  region: string | null

  /** Expiry date (null if no expiry) */
  expiryDate: Date | null
}

/**
 * Legacy Red Seal data structure (from old schema)
 */
export interface RedSealLegacyData {
  /** Whether mechanic has Red Seal certification */
  certified: boolean

  /** Red Seal number */
  number: string | null

  /** Province of Red Seal certification */
  province: string | null

  /** Expiry date */
  expiryDate: Date | null
}

/**
 * Database row format for certification fields (from mechanics table)
 */
export interface MechanicCertificationRow {
  // New canonical fields
  certification_type: CertificationType | null
  certification_number: string | null
  certification_authority: string | null
  certification_region: string | null
  certification_expiry_date: string | null // DATE stored as ISO string

  // Legacy Red Seal fields (deprecated but kept for compatibility)
  red_seal_certified: boolean | null
  red_seal_number: string | null
  red_seal_province: string | null
  red_seal_expiry_date: string | null // DATE stored as ISO string
}

/**
 * Insert/Update payload for certification data
 */
export interface CertificationUpdatePayload {
  // New canonical fields
  certification_type: CertificationType | null
  certification_number: string | null
  certification_authority: string | null
  certification_region: string | null
  certification_expiry_date: string | null

  // Legacy fields (dual-write for backward compatibility)
  red_seal_certified: boolean | null
  red_seal_number: string | null
  red_seal_province: string | null
  red_seal_expiry_date: string | null
}
