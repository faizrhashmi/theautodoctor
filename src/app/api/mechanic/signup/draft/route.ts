// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured', 500);

  try {
    const { form, step } = await req.json();

    if (!form?.email) {
      return bad('Email is required to save draft');
    }

    // Check if mechanic already exists (might be resuming application)
    const { data: existing } = await supabaseAdmin
      .from('mechanics')
      .select('id')
      .eq('email', form.email)
      .single();

    if (existing) {
      // Update draft for existing mechanic
      const { error } = await supabaseAdmin
        .from('mechanics')
        .update({
          application_draft: { form, step },
          current_step: step,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('[DRAFT SAVE] Update error:', error);
        return bad('Failed to save draft', 500);
      }

      return NextResponse.json({ success: true, message: 'Draft saved' });
    }

    // If mechanic doesn't exist yet, create a draft record
    const { error } = await supabaseAdmin.from('mechanics').insert({
      email: form.email,
      name: form.name || null,
      phone: form.phone || null,
      password_hash: '', // Empty for now, will be set on final submission
      application_draft: { form, step },
      application_status: 'draft',
      current_step: step,
    });

    if (error) {
      // If email already exists, that's ok - they might be resuming
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Draft saved' });
      }
      console.error('[DRAFT SAVE] Insert error:', error);
      return bad('Failed to save draft', 500);
    }

    return NextResponse.json({ success: true, message: 'Draft saved' });
  } catch (e: any) {
    console.error('[DRAFT SAVE] Error:', e);
    return bad(e.message || 'Failed to save draft', 500);
  }
}
