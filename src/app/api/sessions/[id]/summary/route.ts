import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logInfo } from '@/lib/log'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function createClient() {
  const cookieStore = cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  try {
    // Auth check: only mechanic can submit summary
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify this user is the mechanic for this session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*, mechanic:mechanic_id(*), customer:customer_user_id(*)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.mechanic_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the assigned mechanic can submit summary' },
        { status: 403 }
      )
    }

    // Check if summary already submitted
    if (session.summary_submitted_at) {
      return NextResponse.json(
        { error: 'Summary already submitted for this session' },
        { status: 400 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const findings = formData.get('findings') as string
    const stepsTaken = formData.get('steps_taken') as string
    const partsNeeded = formData.get('parts_needed') as string
    const nextSteps = formData.get('next_steps') as string

    // Validate required fields
    if (!findings || !stepsTaken || !nextSteps) {
      return NextResponse.json(
        { error: 'Missing required fields: findings, steps_taken, next_steps' },
        { status: 400 }
      )
    }

    // Upload photos to session files (if any)
    const photoUrls: string[] = []
    let photoIndex = 0
    while (formData.has(`photo_${photoIndex}`)) {
      const photo = formData.get(`photo_${photoIndex}`) as File
      if (photo && photo.size > 0) {
        try {
          const timestamp = Date.now()
          const randomId = Math.random().toString(36).substring(7)
          const fileExt = photo.name.split('.').pop() || 'jpg'
          const storagePath = `${sessionId}/summary/${timestamp}-${randomId}.${fileExt}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabaseAdmin.storage
            .from('session-files')
            .upload(storagePath, photo, {
              cacheControl: '3600',
              upsert: false,
            })

          if (!uploadError) {
            // Insert file record
            const { data: fileRecord } = await supabaseAdmin
              .from('session_files')
              .insert({
                session_id: sessionId,
                uploaded_by: user.id,
                name: photo.name,
                type: photo.type,
                size: photo.size,
                storage_path: storagePath,
              })
              .select()
              .single()

            if (fileRecord) {
              // Generate signed URL
              const { data: urlData } = await supabaseAdmin.storage
                .from('session-files')
                .createSignedUrl(storagePath, 3600 * 24 * 7) // 7 days

              if (urlData?.signedUrl) {
                photoUrls.push(urlData.signedUrl)
              }
            }
          }
        } catch (uploadErr) {
          console.error(`Failed to upload photo ${photoIndex}:`, uploadErr)
        }
      }
      photoIndex++
    }

    // Update session with summary
    const summaryData = {
      findings,
      steps_taken: stepsTaken,
      parts_needed: partsNeeded,
      next_steps: nextSteps,
      photos: photoUrls,
    }

    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({
        summary_data: summaryData,
        summary_submitted_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to update session with summary:', updateError)
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      )
    }

    // Log summary submission
    await logInfo('session.summary_submitted', `Summary submitted for session ${sessionId}`, {
      sessionId,
      mechanicId: user.id,
      customerId: session.customer_user_id,
      hasPhotos: photoUrls.length > 0,
    })

    // Send email to customer
    try {
      await sendSummaryEmail({
        sessionId,
        customerEmail: session.customer?.email || '',
        customerName: session.customer?.full_name || 'Customer',
        mechanicName: session.mechanic?.full_name || 'Your Mechanic',
        summary: summaryData,
      })
    } catch (emailErr) {
      console.error('Failed to send summary email:', emailErr)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Summary submitted successfully',
    })
  } catch (error: any) {
    console.error('[Summary Submission] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  try {
    // Auth check
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get session with summary
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('summary_data, summary_submitted_at, mechanic_id, customer_user_id')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is participant
    if (session.mechanic_id !== user.id && session.customer_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!session.summary_submitted_at) {
      return NextResponse.json({ error: 'Summary not yet submitted' }, { status: 404 })
    }

    return NextResponse.json({
      summary: session.summary_data,
      submitted_at: session.summary_submitted_at,
    })
  } catch (error: any) {
    console.error('[Get Summary] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to send summary email
async function sendSummaryEmail({
  sessionId,
  customerEmail,
  customerName,
  mechanicName,
  summary,
}: {
  sessionId: string
  customerEmail: string
  customerName: string
  mechanicName: string
  summary: {
    findings: string
    steps_taken: string
    parts_needed: string
    next_steps: string
    photos: string[]
  }
}) {
  // Using Resend for email sending
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email')
    return
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Summary</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">Session Summary</h1>
    <p style="margin: 10px 0 0 0; color: #cbd5e1;">From ${mechanicName}</p>
  </div>

  <div style="background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p>Hi ${customerName},</p>
    <p>Thank you for using The Auto Doctor. Here's a summary of your diagnostic session:</p>

    <div style="margin: 20px 0; padding: 15px; background-color: white; border-left: 4px solid #3b82f6; border-radius: 4px;">
      <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Diagnostic Findings</h2>
      <p style="white-space: pre-wrap;">${summary.findings}</p>
    </div>

    <div style="margin: 20px 0; padding: 15px; background-color: white; border-left: 4px solid #10b981; border-radius: 4px;">
      <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Steps Taken</h2>
      <p style="white-space: pre-wrap;">${summary.steps_taken}</p>
    </div>

    ${summary.parts_needed ? `
    <div style="margin: 20px 0; padding: 15px; background-color: white; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Parts/Repairs Needed</h2>
      <p style="white-space: pre-wrap;">${summary.parts_needed}</p>
    </div>
    ` : ''}

    <div style="margin: 20px 0; padding: 15px; background-color: white; border-left: 4px solid #8b5cf6; border-radius: 4px;">
      <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Recommended Next Steps</h2>
      <p style="white-space: pre-wrap;">${summary.next_steps}</p>
    </div>

    ${summary.photos && summary.photos.length > 0 ? `
    <div style="margin: 20px 0;">
      <h2 style="color: #1e293b; font-size: 18px;">Photos (${summary.photos.length})</h2>
      <p style="font-size: 14px; color: #64748b;">Photos from your session are available in your dashboard</p>
    </div>
    ` : ''}

    <div style="margin: 30px 0; padding: 20px; background-color: white; border-radius: 4px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/customer/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
        View Full Summary in Dashboard
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
      Session ID: ${sessionId.slice(0, 8)}
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      Thank you for choosing The Auto Doctor!
    </p>
  </div>
</body>
</html>
  `

  // Make API call to Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'The Auto Doctor <noreply@theautodoctor.com>',
      to: customerEmail,
      subject: `Session Summary from ${mechanicName}`,
      html: emailHtml,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Resend API error: ${errorText}`)
  }

  const result = await response.json()
  console.log('[Email] Summary email sent:', result.id)

  return result
}
