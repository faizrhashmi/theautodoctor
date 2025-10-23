import { AccessToken } from 'livekit-server-sdk'

/**
 * Server-side LiveKit token generator
 * Use this instead of fetching /api/livekit/token to avoid HTTP requests in server components
 */
export async function generateLiveKitToken({
  room,
  identity,
  metadata,
}: {
  room: string
  identity: string
  metadata?: Record<string, any>
}): Promise<{ token: string; serverUrl: string }> {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error(
      'LiveKit credentials are not configured. Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables.'
    )
  }

  try {
    const accessToken = new AccessToken(apiKey, apiSecret, {
      identity,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    })

    accessToken.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await accessToken.toJwt()

    const serverUrl =
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      process.env.LIVEKIT_URL ||
      'wss://myautodoctorca-oe6r6oqr.livekit.cloud'

    return { token, serverUrl }
  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    throw new Error(
      `Failed to generate LiveKit token: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
