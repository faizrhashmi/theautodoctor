// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

// Simplified country detection based on IP
// In production, you would use a service like ipapi.co, ip-api.com, or MaxMind GeoIP2
export async function GET(req: NextRequest) {
  try {
    // Get IP address from request headers
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Default to United States for development/localhost
    if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return NextResponse.json({
        detected: true,
        country: {
          code: 'US',
          name: 'United States',
          flag: '🇺🇸',
          phoneCode: '+1',
        },
        ip,
        source: 'default',
      })
    }

    // In production, use a geolocation API
    // Example with ip-api.com (free tier):
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode`, {
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()

        if (data.status === 'success') {
          // Map country code to our country data
          const countryMap: Record<string, { name: string; flag: string; phoneCode: string }> = {
            US: { name: 'United States', flag: '🇺🇸', phoneCode: '+1' },
            CA: { name: 'Canada', flag: '🇨🇦', phoneCode: '+1' },
            GB: { name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44' },
            AU: { name: 'Australia', flag: '🇦🇺', phoneCode: '+61' },
            DE: { name: 'Germany', flag: '🇩🇪', phoneCode: '+49' },
            FR: { name: 'France', flag: '🇫🇷', phoneCode: '+33' },
            IN: { name: 'India', flag: '🇮🇳', phoneCode: '+91' },
            CN: { name: 'China', flag: '🇨🇳', phoneCode: '+86' },
            JP: { name: 'Japan', flag: '🇯🇵', phoneCode: '+81' },
            BR: { name: 'Brazil', flag: '🇧🇷', phoneCode: '+55' },
            MX: { name: 'Mexico', flag: '🇲🇽', phoneCode: '+52' },
            // Add more as needed
          }

          const countryInfo = countryMap[data.countryCode] || {
            name: data.country,
            flag: '',
            phoneCode: '',
          }

          return NextResponse.json({
            detected: true,
            country: {
              code: data.countryCode,
              ...countryInfo,
            },
            ip,
            source: 'ip-api',
          })
        }
      }
    } catch (geoError) {
      console.error('[geo/detect] Geolocation API error:', geoError)
      // Fall through to default
    }

    // Default fallback
    return NextResponse.json({
      detected: false,
      country: {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        phoneCode: '+1',
      },
      ip,
      source: 'fallback',
    })
  } catch (error: any) {
    console.error('[geo/detect] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to detect location',
        country: {
          code: 'US',
          name: 'United States',
          flag: '🇺🇸',
          phoneCode: '+1',
        },
      },
      { status: 500 }
    )
  }
}
