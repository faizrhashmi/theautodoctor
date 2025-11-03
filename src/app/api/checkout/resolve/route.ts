import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'missing session_id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('id, type')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const route =
    data.type === 'chat'
      ? `/chat/${data.id}`
      : `/video/${data.id}`;

  return NextResponse.json({ route });
}
