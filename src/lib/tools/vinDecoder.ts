export interface VINDecodedData {
  make: string
  model: string
  year: string
  trim?: string
  engineSize?: string
  fuelType?: string
  transmission?: string
  driveType?: string
}

export async function decodeVIN(vin: string): Promise<VINDecodedData | null> {
  try {
    // Validate VIN format (17 characters, alphanumeric, no I, O, or Q)
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i
    if (!vinRegex.test(vin)) {
      throw new Error('Invalid VIN format. VIN must be 17 characters.')
    }

    // Use NHTSA's free VIN decoder API
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to decode VIN')
    }

    const data = await response.json()
    const result = data.Results?.[0]

    if (!result || result.ErrorCode !== '0') {
      throw new Error(result?.ErrorText || 'VIN not found')
    }

    return {
      make: result.Make || 'Unknown',
      model: result.Model || 'Unknown',
      year: result.ModelYear || 'Unknown',
      trim: result.Trim || undefined,
      engineSize: result.DisplacementL ? `${result.DisplacementL}L` : undefined,
      fuelType: result.FuelTypePrimary || undefined,
      transmission: result.TransmissionStyle || undefined,
      driveType: result.DriveType || undefined
    }
  } catch (error) {
    console.error('VIN decode error:', error)
    return null
  }
}
