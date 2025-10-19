import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const plan = String(form.get('plan') || 'trial');
  const payload: any = {
    plan,
    name: form.get('name') || null,
    email: form.get('email') || null,
    phone: form.get('phone') || null,
    city: form.get('city') || null,
    vin: form.get('vin') || null,
    year: form.get('year') || null,
    make: form.get('make') || null,
    model: form.get('model') || null,
    odometer: form.get('odometer') || null,
    plate: form.get('plate') || null,
    concern: form.get('concern') || null,
    files: [],
  };

  let intakeId: string | null = null;
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('intakes').insert(payload).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    intakeId = data.id;
  } else {
    intakeId = `local-${Date.now()}`;
  }

  if (plan === 'trial' || plan === 'free' || plan === 'trial-free') {
    return NextResponse.json({ redirect: `/start?trial=1&intake_id=${encodeURIComponent(intakeId!)}` });
  }

  return NextResponse.json({ redirect: `/api/checkout?plan=${encodeURIComponent(plan)}&intake_id=${encodeURIComponent(intakeId!)}` });
}
