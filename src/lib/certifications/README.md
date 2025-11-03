# Certification Management Library

Provides dual-read/write helpers for handling mechanic certifications with full backward compatibility.

## Overview

This library manages the transition from Red Seal-only certifications to supporting all certified mechanics:
- Red Seal (Interprovincial)
- Provincial Journeyperson
- ASE (US)
- CPA Quebec
- Manufacturer Specialists
- Other recognized certifications

## Strategy

**READ:** Prefer new `certification_*` fields, fallback to legacy `red_seal_*` fields
**WRITE:** Dual-write to both new and legacy fields (for Red Seal types)

This ensures:
- ✅ Zero breaking changes
- ✅ Full backward compatibility
- ✅ Gradual migration from legacy to canonical fields

## Usage

### Reading Certification Data

```typescript
import { readCertification, getCertificationLabel } from '@/lib/certifications'

// Read from any mechanic row (works with both new and legacy fields)
const mechanic = await supabase
  .from('mechanics')
  .select('*')
  .eq('id', mechanicId)
  .single()

const cert = readCertification(mechanic.data)

if (cert) {
  console.log('Type:', cert.type) // 'red_seal', 'provincial', etc.
  console.log('Number:', cert.number)
  console.log('Authority:', cert.authority)
  console.log('Region:', cert.region)
  console.log('Expires:', cert.expiryDate)
}

// Get human-readable label
const label = getCertificationLabel(mechanic.data)
// Returns: "Red Seal Certified", "Provincial Journeyperson", etc.
```

### Writing Certification Data

```typescript
import { prepareCertificationUpdate } from '@/lib/certifications'

// Create certification data
const cert: CertificationData = {
  type: 'provincial',
  number: '123456',
  authority: 'Ontario College of Trades',
  region: 'ON',
  expiryDate: null,
}

// Prepare for database update (dual-writes to both new and legacy fields)
const payload = prepareCertificationUpdate(cert)

await supabase
  .from('mechanics')
  .update(payload)
  .eq('id', mechanicId)

// This automatically writes to:
// - certification_type, certification_number, etc. (new fields)
// - red_seal_certified, red_seal_number, etc. (legacy fields if Red Seal)
```

### Checking Certification Status

```typescript
import {
  isRedSealCertified,
  isCertified,
  isCertificationExpired
} from '@/lib/certifications'

const mechanic = await getMechanic(mechanicId)

// Check if Red Seal (checks both new and legacy fields)
if (isRedSealCertified(mechanic)) {
  console.log('This mechanic is Red Seal certified')
}

// Check if ANY certification
if (isCertified(mechanic)) {
  console.log('This mechanic is certified')
}

// Check expiry
const cert = readCertification(mechanic)
if (cert && isCertificationExpired(cert)) {
  console.log('Certification has expired!')
}
```

### Formatting for Display

```typescript
import {
  formatCertificationNumber,
  getCertificationBadge
} from '@/lib/certifications'

const cert = readCertification(mechanic)

// Format number for display
const formatted = formatCertificationNumber(cert)
// Red Seal: "RS-ON-12345678"
// Provincial: "#123456"
// ASE: "ASE A1"

// Get short badge text
const badge = getCertificationBadge(mechanic)
// "Red Seal", "Provincial", "ASE", etc.
```

## Migration Helper

```typescript
import { mapLegacyToCanonical } from '@/lib/certifications'

// Convert legacy Red Seal data to canonical format
const legacy = {
  certified: true,
  number: 'RS-ON-12345678',
  province: 'ON',
  expiryDate: new Date('2025-12-31'),
}

const canonical = mapLegacyToCanonical(legacy)
// Returns CertificationData with type: 'red_seal'
```

## API Reference

### Types

- **CertificationType**: Union of all supported cert types
- **CertificationData**: Canonical certification data structure
- **MechanicCertificationRow**: Database row format
- **CertificationUpdatePayload**: Insert/Update payload

### Functions

| Function | Purpose |
|----------|---------|
| `readCertification()` | Read cert from DB row (new or legacy) |
| `prepareCertificationUpdate()` | Prepare dual-write payload |
| `isRedSealCertified()` | Check if Red Seal |
| `isCertified()` | Check if ANY certification |
| `getCertificationLabel()` | Get human-readable label |
| `getCertificationBadge()` | Get short badge text |
| `formatCertificationNumber()` | Format number for display |
| `isCertificationExpired()` | Check if expired |
| `getDaysUntilExpiry()` | Calculate days to expiry |
| `mapLegacyToCanonical()` | Convert legacy data |
| `isValidCertificationType()` | Validate cert type string |

### Constants

| Constant | Purpose |
|----------|---------|
| `CERTIFICATION_LABELS` | Human-readable labels for each type |
| `CERTIFICATION_AUTHORITIES` | Example authorities for each type |
| `CANADIAN_PROVINCES` | Province codes and names |

## Testing

Run tests:
```bash
pnpm test src/lib/certifications
```

Tests cover:
- Dual-read logic (prefer new, fallback to legacy)
- Dual-write payload generation
- Red Seal backward compatibility
- All certification types
- Expiry calculations
- Display formatting

## Backward Compatibility

✅ **All existing code continues to work:**

```typescript
// OLD CODE (still works)
const isRedSeal = mechanic.red_seal_certified
const redSealNumber = mechanic.red_seal_number

// NEW CODE (preferred)
import { isRedSealCertified, readCertification } from '@/lib/certifications'
const isRedSeal = isRedSealCertified(mechanic)
const cert = readCertification(mechanic)
```

## Next Steps

After Phase 2:
- **Phase 3:** Backfill existing Red Seal data into new generic columns
- **Phase 4:** Update frontend copy to be certification-agnostic
- **Phase 5:** Create multi-cert badge UI component
- **Phase 6:** Update signup/profile forms to support all cert types
- **Phase 7:** Update mechanic matching logic to use canonical fields
