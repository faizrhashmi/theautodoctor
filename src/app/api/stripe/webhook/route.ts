import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err:any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    const bookingId = s.metadata?.booking_id
    if (bookingId) {
      const { data: bookings } = await supabase.from('bookings').select('id, start_at').eq('id', bookingId)
      if (bookings?.length) {
        await supabase.from('bookings').update({ status: 'paid' }).eq('id', bookingId)
        await supabase.from('slots').update({ status:'booked', held_until: null }).eq('start_at', bookings[0].start_at)
      }
    }
  }

  return new Response('ok', { status: 200 })
}

