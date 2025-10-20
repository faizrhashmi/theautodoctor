import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);

  const { filename, contentType } = await req.json().catch(() => ({}));
  if (!filename) return bad('filename required');

  // Generate a unique path (date + random)
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 10);
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const path = `${yyyy}/${mm}/${dd}/${rand}-${safeName}`;

  // Create a signed upload URL (valid for 10 minutes)
  // Requires Supabase JS v2+
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return bad(error?.message || 'Failed to create signed URL', 500);
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: `${BUCKET}/${path}`,
    contentType: contentType || 'application/octet-stream',
    expiresIn: 600,
  });
}
