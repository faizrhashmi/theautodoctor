import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAPI } from '@/lib/auth/guards';
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(request);
  if (authResult.error) return authResult.error;

  const customer = authResult.data;
  console.log(`[CUSTOMER] ${customer.email} scheduling session`);

  const body = await request.json().catch(() => ({}));
  const slot = typeof body?.slot === "string" && body.slot.trim().length ? body.slot : null;
  const plan = typeof body?.plan === "string" ? body.plan : null;
  const date = typeof body?.date === "string" && body.date.trim().length ? body.date : null;

  if (!plan) {
    return NextResponse.json({ error: "plan is required" }, { status: 400 });
  }
  if (!slot && !date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const lastSlot = slot ?? date;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: customer.id,
        email: customer.email,
        role: "customer",
        preferred_plan: plan,
        last_selected_slot: lastSlot,
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("schedule upsert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
