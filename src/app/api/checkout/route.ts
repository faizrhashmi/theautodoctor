import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const PRICE_MAP: Record<string, string> = {
  chat10: process.env.STRIPE_PRICE_CHAT10 || "price_chat10_placeholder",
  video15: process.env.STRIPE_PRICE_VIDEO15 || "price_video15_placeholder",
  diagnostic: process.env.STRIPE_PRICE_DIAGNOSTIC || "price_diagnostic_placeholder",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plan = searchParams.get("plan");
  const intakeId = searchParams.get('intake_id') || undefined;

  if (!plan || !PRICE_MAP[plan]) {
    return NextResponse.json({ error: "Unknown or missing plan" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.origin}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
      client_reference_id: intakeId,
      metadata: { plan, intake_id: intakeId || '' },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Unable to create checkout" }, { status: 500 });
    }

    return NextResponse.redirect(session.url);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe error" }, { status: 500 });
  }
}
