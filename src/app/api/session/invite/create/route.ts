import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

/**
 * P0-6 FIX: Create one-time invite code (replaces token-in-URL)
 *
 * Security improvements:
 * - Codes are short and cannot be decoded to reveal session info
 * - Codes are single-use (consumed on redemption)
 * - Codes expire after 24 hours
 * - Codes are never logged in plaintext
 */

// Generate secure random invite code (8 chars, alphanumeric uppercase)
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars (0,O,1,I)
  const length = 8;
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// P0-6 FIX: Redact invite codes from logs
function redactCode(code: string): string {
  return `${code.substring(0, 2)}****${code.substring(code.length - 2)}`;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check: require authenticated user (customer or admin)
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[INVITE-CREATE] Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { session_id, role = 'mechanic' } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Validate session exists and user has access
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, customer_id, status')
      .eq('id', session_id)
      .maybeSingle();

    if (sessionError || !session) {
      console.error('[INVITE-CREATE] Session not found:', session_id);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // TODO: Add authorization check (user must own session or be admin)

    // Generate unique invite code (retry if collision)
    let code: string;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      code = generateInviteCode();

      // Check if code already exists
      const { data: existing } = await supabaseAdmin
        .from('session_invites')
        .select('code')
        .eq('code', code)
        .maybeSingle();

      if (!existing) {
        break; // Unique code found
      }
      attempts++;
    }

    if (attempts === maxAttempts) {
      console.error('[INVITE-CREATE] Failed to generate unique code after', maxAttempts, 'attempts');
      return NextResponse.json({ error: 'Failed to generate invite code' }, { status: 500 });
    }

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store invite code in database
    const { data: invite, error: insertError } = await supabaseAdmin
      .from('session_invites')
      .insert({
        code: code!,
        session_id: session_id,
        role: role,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !invite) {
      console.error('[INVITE-CREATE] Failed to create invite:', insertError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    // P0-6 FIX: Log event but redact the code
    console.log(`[INVITE-CREATE] Created invite ${redactCode(code!)} for session ${session_id}, expires at ${expiresAt.toISOString()}`);

    return NextResponse.json({
      code: code!,
      expires_at: expiresAt.toISOString(),
      session_id: session_id,
      role: role,
    });

  } catch (error) {
    console.error('[INVITE-CREATE] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
