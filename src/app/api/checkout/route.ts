import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
    apiVersion: '2023-10-16'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { service_code, slot_id } = await req.json()
    
    if (!service_code || !slot_id) {
      return Response.json({ error: 'Missing service or slot' }, { status: 400 })
    }

    // Get service
    const { data: services, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('code', service_code)
      .limit(1)
    
    if (serviceError) throw serviceError
    const service = services?.[0]
    if (!service) return Response.json({ error: 'Service not found' }, { status: 404 })

    // Get and reserve slot
    const { data: slots, error: slotError } = await supabase
      .from('slots')
      .select('*')
      .eq('id', slot_id)
      .eq('status', 'open')
      .limit(1)
    
    if (slotError) throw slotError
    const slot = slots?.[0]
    if (!slot) return Response.json({ error: 'Slot not available' }, { status: 400 })

    // Hold the slot
    const { error: holdError } = await supabase
      .from('slots')
      .update({ 
        status: 'held', 
        held_until: new Date(Date.now() + 10 * 60 * 1000).toISOString() 
      })
      .eq('id', slot_id)
    
    if (holdError) throw holdError

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        mechanic_id: slot.mechanic_id,
        service_id: service.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError) throw bookingError

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'cad',
          product_data: { 
            name: service.name,
            description: `${service.duration_min} minute consultation`
          },
          unit_amount: service.price_cents,
        },
        quantity: 1
      }],
      metadata: { 
        booking_id: String(booking.id),
        slot_id: String(slot_id)
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/session/${booking.id}?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book?canceled=1`,
    })

    return Response.json({ url: session.url })
  } catch (e: any) {
    console.error('Checkout error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}