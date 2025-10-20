import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  const supabaseClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        id: user.id,
        email: user.email ?? null,
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
