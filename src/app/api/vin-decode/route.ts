/**
 * VIN Decoder API
 * Uses NHTSA VIN Decoder (free, no API key required)
 * https://vpic.nhtsa.dot.gov/api/
 */

import { NextRequest, NextResponse } from 'next/server'

interface VINDecodeResponse {
  success: boolean
  data?: {
    year?: string
    make?: string
    model?: string
    trim?: string
    bodyClass?: string
    engineCylinders?: string
    engineDisplacement?: string
    fuelType?: string
    manufacturer?: string
  }
  error?: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vin = searchParams.get('vin')

    if (!vin) {
      return NextResponse.json(
        { success: false, error: 'VIN parameter is required' },
        { status: 400 }
      )
    }

    // Validate VIN length (should be 17 characters)
    if (vin.length !== 17) {
      return NextResponse.json(
        { success: false, error: 'VIN must be exactly 17 characters' },
        { status: 400 }
      )
    }

    // Call NHTSA VIN Decoder API
    const nhtsaUrl = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`

    console.log('[VIN-DECODE] Decoding VIN:', vin)

    const response = await fetch(nhtsaUrl)

    if (!response.ok) {
      console.error('[VIN-DECODE] NHTSA API error:', response.status, response.statusText)
      return NextResponse.json(
        { success: false, error: 'Failed to decode VIN. Please try again.' },
        { status: 500 }
      )
    }

    const data = await response.json()

    // NHTSA returns results array, first item has the decoded data
    const result = data.Results?.[0]

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No data returned from VIN decoder' },
        { status: 404 }
      )
    }

    // Check if VIN is valid
    if (result.ErrorCode && result.ErrorCode !== '0') {
      console.warn('[VIN-DECODE] Invalid VIN:', result.ErrorText)
      return NextResponse.json(
        { success: false, error: result.ErrorText || 'Invalid VIN' },
        { status: 400 }
      )
    }

    // Extract relevant vehicle information
    const vehicleData = {
      year: result.ModelYear || '',
      make: result.Make || '',
      model: result.Model || '',
      trim: result.Trim || '',
      bodyClass: result.BodyClass || '',
      engineCylinders: result.EngineCylinders || '',
      engineDisplacement: result.DisplacementL || '',
      fuelType: result.FuelTypePrimary || '',
      manufacturer: result.Manufacturer || '',
    }

    console.log('[VIN-DECODE] Successfully decoded:', vehicleData)

    return NextResponse.json({
      success: true,
      data: vehicleData,
    } as VINDecodeResponse)
  } catch (error: any) {
    console.error('[VIN-DECODE] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to decode VIN',
      },
      { status: 500 }
    )
  }
}
