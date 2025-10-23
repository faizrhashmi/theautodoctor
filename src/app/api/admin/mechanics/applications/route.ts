// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500);

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    // Fetch applications based on status
    const { data: applications, error } = await supabaseAdmin
      .from('mechanics')
      .select('*')
      .eq('application_status', status)
      .order('application_submitted_at', { ascending: false });

    if (error) {
      console.error('[ADMIN] Failed to fetch applications:', error);
      return bad('Failed to fetch applications', 500);
    }

    return NextResponse.json({
      success: true,
      applications: applications || [],
    });
  } catch (e: any) {
    console.error('[ADMIN] Error:', e);
    return bad(e.message || 'Failed to fetch applications', 500);
  }
}
