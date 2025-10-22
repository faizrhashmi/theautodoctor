import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const SAMPLE_MECHANICS = [
  { id: "mech-1", name: "Alex Chen", specialty: "Electrical diagnostics", eta: 3 },
  { id: "mech-2", name: "Priya Singh", specialty: "Hybrid systems", eta: 5 },
  { id: "mech-3", name: "Jordan Ellis", specialty: "Suspension & steering", eta: 2 },
];

function getAvailability() {
  const index = Math.floor((Date.now() / 60000) % SAMPLE_MECHANICS.length);
  const mechanic = SAMPLE_MECHANICS[index];
  return {
    available: true,
    mechanic,
    count: SAMPLE_MECHANICS.length,
  };
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  } = await supabase.auth.getUser();

  const availability = getAvailability();

  if (!user) {
    return NextResponse.json({
      available: availability.available,
      mechanicsOnline: availability.count,
    });
  }

  return NextResponse.json({
    available: availability.available,
    mechanicsOnline: availability.count,
    mechanic: availability.mechanic ? {
      id: availability.mechanic.id,
      name: availability.mechanic.name,
      specialty: availability.mechanic.specialty,
      eta: availability.mechanic.eta,
    } : null,
  });
}
