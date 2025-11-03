/**
 * Unit tests for certification mapper functions
 *
 * Tests dual-read/write logic and backward compatibility
 */

import {
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
} from '../certMapper'
import type { CertificationData, MechanicCertificationRow } from '../certTypes'

describe('readCertification', () => {
  it('should read from new canonical fields when present', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: 'red_seal',
      certification_number: 'RS-ON-12345678',
      certification_authority: 'Red Seal Program',
      certification_region: 'ON',
      certification_expiry_date: '2025-12-31',
      // Legacy fields also present but should be ignored
      red_seal_certified: true,
      red_seal_number: 'OLD-NUMBER',
    }

    const result = readCertification(row)

    expect(result).toEqual({
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: 'Red Seal Program',
      region: 'ON',
      expiryDate: new Date('2025-12-31'),
    })
  })

  it('should fallback to legacy red_seal fields when canonical fields missing', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: null,
      red_seal_certified: true,
      red_seal_number: 'RS-ON-87654321',
      red_seal_province: 'BC',
      red_seal_expiry_date: '2026-06-30',
    }

    const result = readCertification(row)

    expect(result).toEqual({
      type: 'red_seal',
      number: 'RS-ON-87654321',
      authority: 'Red Seal Program', // Auto-filled
      region: 'BC',
      expiryDate: new Date('2026-06-30'),
    })
  })

  it('should return null when no certification data present', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: null,
      red_seal_certified: false,
    }

    const result = readCertification(row)

    expect(result).toBeNull()
  })

  it('should handle provincial certification', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: 'provincial',
      certification_number: '123456',
      certification_authority: 'Ontario College of Trades',
      certification_region: 'ON',
      certification_expiry_date: null,
    }

    const result = readCertification(row)

    expect(result).toEqual({
      type: 'provincial',
      number: '123456',
      authority: 'Ontario College of Trades',
      region: 'ON',
      expiryDate: null,
    })
  })

  it('should handle ASE certification', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: 'ase',
      certification_number: 'A1',
      certification_authority: 'ASE',
      certification_region: 'US',
      certification_expiry_date: null,
    }

    const result = readCertification(row)

    expect(result?.type).toBe('ase')
    expect(result?.number).toBe('A1')
  })
})

describe('prepareCertificationUpdate', () => {
  it('should dual-write Red Seal to both new and legacy fields', () => {
    const cert: CertificationData = {
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: 'Red Seal Program',
      region: 'ON',
      expiryDate: new Date('2025-12-31'),
    }

    const result = prepareCertificationUpdate(cert)

    expect(result).toEqual({
      // New canonical fields
      certification_type: 'red_seal',
      certification_number: 'RS-ON-12345678',
      certification_authority: 'Red Seal Program',
      certification_region: 'ON',
      certification_expiry_date: '2025-12-31',
      // Legacy fields (dual-write)
      red_seal_certified: true,
      red_seal_number: 'RS-ON-12345678',
      red_seal_province: 'ON',
      red_seal_expiry_date: '2025-12-31',
    })
  })

  it('should write provincial cert to canonical fields only', () => {
    const cert: CertificationData = {
      type: 'provincial',
      number: '123456',
      authority: 'Ontario College of Trades',
      region: 'ON',
      expiryDate: null,
    }

    const result = prepareCertificationUpdate(cert)

    expect(result).toEqual({
      // New canonical fields
      certification_type: 'provincial',
      certification_number: '123456',
      certification_authority: 'Ontario College of Trades',
      certification_region: 'ON',
      certification_expiry_date: null,
      // Legacy fields cleared (not Red Seal)
      red_seal_certified: false,
      red_seal_number: null,
      red_seal_province: null,
      red_seal_expiry_date: null,
    })
  })

  it('should clear all fields when cert is null', () => {
    const result = prepareCertificationUpdate(null)

    expect(result).toEqual({
      certification_type: null,
      certification_number: null,
      certification_authority: null,
      certification_region: null,
      certification_expiry_date: null,
      red_seal_certified: false,
      red_seal_number: null,
      red_seal_province: null,
      red_seal_expiry_date: null,
    })
  })
})

describe('isRedSealCertified', () => {
  it('should return true when certification_type is red_seal', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: 'red_seal',
      red_seal_certified: false, // Ignored
    }

    expect(isRedSealCertified(row)).toBe(true)
  })

  it('should fallback to legacy red_seal_certified field', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: null,
      red_seal_certified: true,
    }

    expect(isRedSealCertified(row)).toBe(true)
  })

  it('should return false for non-Red Seal certifications', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: 'provincial',
      red_seal_certified: false,
    }

    expect(isRedSealCertified(row)).toBe(false)
  })
})

describe('isCertified', () => {
  it('should return true for any valid certification', () => {
    const rows = [
      { certification_type: 'red_seal' as const },
      { certification_type: 'provincial' as const },
      { certification_type: 'ase' as const },
      { red_seal_certified: true },
    ]

    rows.forEach((row) => {
      expect(isCertified(row)).toBe(true)
    })
  })

  it('should return false when no certification present', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: null,
      red_seal_certified: false,
    }

    expect(isCertified(row)).toBe(false)
  })
})

describe('getCertificationLabel', () => {
  it('should return correct labels for each certification type', () => {
    const tests = [
      { type: 'red_seal' as const, expected: 'Red Seal Certified' },
      { type: 'provincial' as const, expected: 'Provincial Journeyperson' },
      { type: 'ase' as const, expected: 'ASE Certified' },
      { type: 'cpa_quebec' as const, expected: 'CPA Quebec Certified' },
      { type: 'manufacturer' as const, expected: 'Manufacturer Specialist' },
      { type: 'other' as const, expected: 'Certified Technician' },
    ]

    tests.forEach(({ type, expected }) => {
      const row: Partial<MechanicCertificationRow> = {
        certification_type: type,
      }
      expect(getCertificationLabel(row)).toBe(expected)
    })
  })

  it('should return null when no certification', () => {
    const row: Partial<MechanicCertificationRow> = {
      certification_type: null,
      red_seal_certified: false,
    }

    expect(getCertificationLabel(row)).toBeNull()
  })
})

describe('getCertificationBadge', () => {
  it('should return short badge text', () => {
    const tests = [
      { type: 'red_seal' as const, expected: 'Red Seal' },
      { type: 'provincial' as const, expected: 'Provincial' },
      { type: 'ase' as const, expected: 'ASE' },
    ]

    tests.forEach(({ type, expected }) => {
      const row: Partial<MechanicCertificationRow> = {
        certification_type: type,
      }
      expect(getCertificationBadge(row)).toBe(expected)
    })
  })
})

describe('mapLegacyToCanonical', () => {
  it('should convert legacy Red Seal data to canonical format', () => {
    const legacy = {
      certified: true,
      number: 'RS-ON-12345678',
      province: 'ON',
      expiryDate: new Date('2025-12-31'),
    }

    const result = mapLegacyToCanonical(legacy)

    expect(result).toEqual({
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: 'Red Seal Program',
      region: 'ON',
      expiryDate: new Date('2025-12-31'),
    })
  })

  it('should return null when not certified', () => {
    const legacy = {
      certified: false,
      number: null,
      province: null,
      expiryDate: null,
    }

    expect(mapLegacyToCanonical(legacy)).toBeNull()
  })
})

describe('isValidCertificationType', () => {
  it('should validate correct certification types', () => {
    const validTypes = ['red_seal', 'provincial', 'ase', 'cpa_quebec', 'manufacturer', 'other']

    validTypes.forEach((type) => {
      expect(isValidCertificationType(type)).toBe(true)
    })
  })

  it('should reject invalid types', () => {
    const invalidTypes = ['invalid', 'redseal', '', 'RED_SEAL']

    invalidTypes.forEach((type) => {
      expect(isValidCertificationType(type)).toBe(false)
    })
  })
})

describe('formatCertificationNumber', () => {
  it('should format Red Seal number as-is', () => {
    const cert: CertificationData = {
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: null,
      region: null,
      expiryDate: null,
    }

    expect(formatCertificationNumber(cert)).toBe('RS-ON-12345678')
  })

  it('should prefix provincial number with #', () => {
    const cert: CertificationData = {
      type: 'provincial',
      number: '123456',
      authority: null,
      region: null,
      expiryDate: null,
    }

    expect(formatCertificationNumber(cert)).toBe('#123456')
  })

  it('should prefix ASE number with ASE', () => {
    const cert: CertificationData = {
      type: 'ase',
      number: 'A1',
      authority: null,
      region: null,
      expiryDate: null,
    }

    expect(formatCertificationNumber(cert)).toBe('ASE A1')
  })

  it('should return null when no number', () => {
    const cert: CertificationData = {
      type: 'red_seal',
      number: null,
      authority: null,
      region: null,
      expiryDate: null,
    }

    expect(formatCertificationNumber(cert)).toBeNull()
  })
})

describe('isCertificationExpired', () => {
  it('should return true for expired certification', () => {
    const cert: CertificationData = {
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: null,
      region: null,
      expiryDate: new Date('2020-01-01'), // Past date
    }

    expect(isCertificationExpired(cert)).toBe(true)
  })

  it('should return false for valid certification', () => {
    const cert: CertificationData = {
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: null,
      region: null,
      expiryDate: new Date('2030-01-01'), // Future date
    }

    expect(isCertificationExpired(cert)).toBe(false)
  })

  it('should return false when no expiry date', () => {
    const cert: CertificationData = {
      type: 'provincial',
      number: '123456',
      authority: null,
      region: null,
      expiryDate: null, // Never expires
    }

    expect(isCertificationExpired(cert)).toBe(false)
  })
})

describe('getDaysUntilExpiry', () => {
  it('should calculate days until expiry', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30) // 30 days from now

    const cert: CertificationData = {
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: null,
      region: null,
      expiryDate: future,
    }

    const days = getDaysUntilExpiry(cert)
    expect(days).toBeGreaterThanOrEqual(29) // Allow for timing variance
    expect(days).toBeLessThanOrEqual(30)
  })

  it('should return negative days for expired cert', () => {
    const past = new Date()
    past.setDate(past.getDate() - 10) // 10 days ago

    const cert: CertificationData = {
      type: 'red_seal',
      number: 'RS-ON-12345678',
      authority: null,
      region: null,
      expiryDate: past,
    }

    const days = getDaysUntilExpiry(cert)
    expect(days).toBeLessThan(0)
  })

  it('should return null when no expiry', () => {
    const cert: CertificationData = {
      type: 'provincial',
      number: '123456',
      authority: null,
      region: null,
      expiryDate: null,
    }

    expect(getDaysUntilExpiry(cert)).toBeNull()
  })
})
