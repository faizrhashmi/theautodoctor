/**
 * POST /api/sessions/create-scheduled
 * Create a scheduled session (future appointment)
 *
 * Key differences from immediate sessions:
 * - Populates scheduled_for field
 * - Status starts as 'scheduled' not 'pending'
 * - Payment collected upfront (online) or deposit (in-person)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import {
  generateCalendarInviteBuffer,
  generateCalendarInviteFilename
} from '@/lib/calendarInvite'

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await request.json()
    const {
      sessionType, // 'online' | 'in_person' (from ServiceTypeStep)
      vehicleId,
      planType,
      mechanicId,
      scheduledFor, // ISO 8601 string
      // NEW: Scheduled intake fields (from ScheduledSessionIntakeStep)
      serviceType, // 'diagnostic' | 'repair' | 'maintenance' | 'inspection' | 'consultation'
      serviceDescription,
      preparationNotes,
      specialRequests,
      uploadedFiles
    } = body

    // 3. Validation
    if (!scheduledFor) {
      return NextResponse.json(
        { error: 'Scheduled time is required' },
        { status: 400 }
      )
    }

    if (!mechanicId) {
      return NextResponse.json(
        { error: 'Mechanic selection is required' },
        { status: 400 }
      )
    }

    // 4. Check for active sessions (prevent double booking)
    const { data: activeSessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('customer_user_id', user.id)
      .in('status', ['pending', 'waiting', 'live'])

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active session. Please complete it before scheduling another.' },
        { status: 400 }
      )
    }

    // 5. Create intake record first (NEW structure for scheduled sessions)
    const { data: intake, error: intakeError } = await supabaseAdmin
      .from('intakes')
      .insert({
        customer_user_id: user.id,
        vehicle_id: vehicleId,
        // NEW: Use serviceType and serviceDescription for scheduled sessions
        primary_concern: serviceType || 'General', // e.g., 'diagnostic', 'repair'
        concern_category: serviceType || 'scheduled_service',
        concern_description: serviceDescription || 'Scheduled appointment',
        // NEW: Additional scheduled-specific fields
        preparation_notes: preparationNotes,
        special_requests: specialRequests,
        uploaded_files: uploadedFiles || [],
        status: 'new'
      })
      .select('id')
      .single()

    if (intakeError || !intake) {
      console.error('[create-scheduled] Intake creation error:', intakeError)
      return NextResponse.json(
        { error: 'Failed to create intake record' },
        { status: 500 }
      )
    }

    // 6. Create scheduled session
    const scheduledDate = new Date(scheduledFor)

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        customer_user_id: user.id,
        mechanic_user_id: mechanicId,
        intake_id: intake.id,
        type: sessionType === 'online' ? 'video' : 'diagnostic',
        plan: planType,
        status: 'scheduled', // ⭐ KEY: Start as 'scheduled' not 'pending'
        scheduled_for: scheduledDate.toISOString(), // ⭐ KEY: Populate this field
        scheduled_start: scheduledDate.toISOString(),
        scheduled_end: new Date(scheduledDate.getTime() + 45 * 60000).toISOString(), // +45 min
        payment_status: sessionType === 'in_person' ? 'deposit_paid' : 'paid',
        payment_method: 'stripe'
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      console.error('[create-scheduled] Session creation error:', sessionError)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // 7. Create session participant records
    await supabaseAdmin.from('session_participants').insert([
      {
        session_id: session.id,
        user_id: user.id,
        role: 'customer',
        joined_at: null // Will join at scheduled time
      },
      {
        session_id: session.id,
        user_id: mechanicId,
        role: 'mechanic',
        joined_at: null // Will join at scheduled time
      }
    ])

    // 8. Get customer and mechanic details for confirmation email
    const { data: customer } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const { data: mechanic } = await supabaseAdmin
      .from('profiles')
      .select('full_name, workshop_name')
      .eq('id', mechanicId)
      .single()

    // 9. Send confirmation email with calendar invite
    if (customer && mechanic) {
      try {
        const formattedDate = scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        })

        const sessionTypeText = sessionType === 'online' ? 'Online Video Session' : 'In-Person Workshop Visit'
        const mechanicName = mechanic.full_name || 'Your Mechanic'

        // Generate calendar invite
        const calendarInvite = generateCalendarInviteBuffer({
          sessionId: session.id,
          customerName: customer.full_name || 'Valued Customer',
          customerEmail: customer.email,
          mechanicName,
          sessionType: sessionType === 'online' ? 'video' : 'diagnostic',
          scheduledFor: scheduledDate,
          description: serviceDescription,
          location: mechanic.workshop_name || undefined
        })

        const confirmationHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✅ Session Confirmed!</h1>
            </div>

            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                Hi ${customer.full_name || 'there'},
              </p>

              <p style="color: #334155; font-size: 16px; margin-bottom: 30px;">
                Great news! Your scheduled session has been confirmed. We've added it to your calendar.
              </p>

              <div style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <h2 style="color: #10b981; margin: 0 0 15px 0; font-size: 18px;">${sessionTypeText}</h2>
                <p style="color: #64748b; margin: 5px 0;"><strong>Mechanic:</strong> ${mechanicName}</p>
                <p style="color: #64748b; margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="color: #64748b; margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
                ${serviceDescription ? `<p style="color: #64748b; margin: 10px 0 0 0;"><strong>Service:</strong><br/>${serviceDescription}</p>` : ''}
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>📋 Important:</strong> You'll need to sign a waiver before joining your session.
                  We'll send you a reminder link 1 hour before your appointment.
                </p>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="color: #334155; font-size: 16px; margin-bottom: 10px;">📅 Calendar Invite Attached</h3>
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  We've attached a calendar invite (.ics file) to this email. Click the attachment to add this session to your calendar app.
                </p>
              </div>

              <div style="margin-bottom: 20px;">
                <h3 style="color: #334155; font-size: 16px; margin-bottom: 10px;">What's Next?</h3>
                <ul style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
                  <li>We'll send you a reminder 24 hours before your session</li>
                  <li>Another reminder 1 hour before with the waiver link</li>
                  <li>Final reminder 15 minutes before if waiver not signed</li>
                  <li>Join via the link below at your scheduled time</li>
                </ul>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${session.id}"
                   style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                  View Session Details
                </a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 5px 0;">
                  <strong>Cancellation Policy:</strong><br/>
                  24+ hours notice: Full refund (minus $5 processing fee)<br/>
                  2-24 hours notice: 75% refund<br/>
                  Less than 2 hours or no-show: 50% account credit, 50% to mechanic
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 15px 0 0 0;">
                  Questions? Reply to this email or contact support@theautodoctor.com
                </p>
              </div>
            </div>
          </div>
        `

        await sendEmail({
          to: customer.email,
          subject: `✅ Session Confirmed - ${formattedDate} at ${formattedTime}`,
          html: confirmationHtml,
          attachments: [
            {
              filename: generateCalendarInviteFilename(session.id),
              content: calendarInvite,
              contentType: 'text/calendar; charset=utf-8; method=REQUEST'
            }
          ]
        })

        console.log(`[create-scheduled] ✅ Confirmation email sent to ${customer.email}`)
      } catch (emailError) {
        console.error('[create-scheduled] Failed to send confirmation email:', emailError)
        // Don't fail the whole request if email fails
      }
    }

    console.log(`[create-scheduled] ✅ Session ${session.id} created for ${scheduledDate}`)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      scheduledFor: scheduledDate.toISOString()
    })

  } catch (error: any) {
    console.error('[create-scheduled] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
