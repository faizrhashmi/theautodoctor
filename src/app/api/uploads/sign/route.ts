import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'intakes';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);

  // SECURITY: Verify user is authenticated (customer or mechanic)
  let userId: string | null = null;
  let userType: 'customer' | 'mechanic' | null = null;

  // Try Supabase auth first (customers/admins)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set() {},
      remove() {},
    },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (user && !authError) {
    userId = user.id;
    userType = 'customer';
    console.log('[Upload Sign] Customer authenticated:', userId);
  } else {
    // Try mechanic auth
    const mechanicToken = req.cookies.get('aad_mech')?.value;

    if (mechanicToken) {
      const { data: mechanicSession } = await supabaseAdmin
        .from('mechanic_sessions')
        .select('mechanic_id, expires_at')
        .eq('token', mechanicToken)
        .maybeSingle();

      if (mechanicSession && new Date(mechanicSession.expires_at) > new Date()) {
        userId = mechanicSession.mechanic_id;
        userType = 'mechanic';
        console.log('[Upload Sign] Mechanic authenticated:', userId);
      }
    }
  }

  // Reject if not authenticated
  if (!userId) {
    console.warn('[Upload Sign] Unauthorized upload attempt');
    return bad('Unauthorized: You must be authenticated to upload files', 401);
  }

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
