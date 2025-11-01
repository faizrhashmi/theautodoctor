import { AccessToken } from 'livekit-server-sdk'

/**
 * Server-side LiveKit token generator
 * Use this instead of fetching /api/livekit/token to avoid HTTP requests in server components
 */
export async function generateLiveKitToken({
  room,
  identity,
}: {
  room: string
  identity: string
}): Promise<{ token: string; serverUrl: string }> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error(
      'LiveKit credentials are not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.'
    )
  }

  try {
    // P0-1 FIX: Remove metadata parameter - no sensitive data in JWT payload
    // P0-2 FIX: Add 60-minute token expiration
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: 3600, // 60 minutes = 3600 seconds
    })

    accessToken.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await accessToken.toJwt()

    // P0-1 FIX: Remove hardcoded URL fallback - require environment variable
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL

    if (!serverUrl) {
      throw new Error(
        'LiveKit server URL is not configured. Please set NEXT_PUBLIC_LIVEKIT_URL or LIVEKIT_URL environment variable.'
      )
    }

    return { token, serverUrl }
  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    throw new Error(
      `Failed to generate LiveKit token: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
