import { NextRequest } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') || 'test'
  const identity = 'user-' + Math.random().toString(36).slice(2,8)

  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity })
  at.addGrant({ roomJoin: true, room })

  const token = await at.toJwt()
  return Response.json({ token })
}
