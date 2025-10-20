import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import type { Json } from '@/types/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes'

type SignedPath = { path: string; url: string }

function parsePaths(value: Json | Json[] | null | undefined): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => (typeof item === 'string' ? [item] : []))
  }

  if (typeof value === 'string') {
    return [value]
  }

  if (typeof value === 'object' && value !== null) {
    const maybePaths = (value as { paths?: Json }).paths
    if (Array.isArray(maybePaths)) {
      return maybePaths.flatMap((item) => (typeof item === 'string' ? [item] : []))
    }
  }

  return []
}

async function signMany(paths: string[]): Promise<SignedPath[]> {
  if (!paths.length) return []

  const signed = await Promise.all(
    paths.map(async (path) => {
      const relativePath = path.startsWith(`${BUCKET}/`) ? path.slice(BUCKET.length + 1) : path
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(relativePath, 3600)
      if (error || !data?.signedUrl) {
        console.error('Failed to sign path', { path, error })
        return null
      }
      return { path, url: data.signedUrl }
    }),
  )

  return signed.filter((item): item is SignedPath => item !== null)
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured on server' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('intakes')
    .select(
      `
      id, created_at, status, plan,
      vin, vehicle_make, vehicle_model, vehicle_year,
      customer_name, customer_phone, customer_email,
      concern, details,
      attachments, media_paths
    `,
    )
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const attachments = parsePaths(data.attachments as Json | Json[] | null)
  const media = parsePaths(data.media_paths as Json | Json[] | null)

  const [signedAttachments, signedMedia] = await Promise.all([
    signMany(attachments),
    signMany(media),
  ])

  return NextResponse.json({ ...data, signedAttachments, signedMedia })
}
