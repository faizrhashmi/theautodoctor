import { NextRequest, NextResponse } from 'next/server'
import { requireSessionParticipantRelaxed } from '@/lib/auth/relaxedSessionAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logInfo } from '@/lib/log'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[POST /sessions/${sessionId}/summary] ${participant.role} submitting summary for session ${participant.sessionId}`)

  // Only mechanics can submit summaries
  if (participant.role !== 'mechanic') {
    return NextResponse.json(
      { error: 'Only the assigned mechanic can submit summary' },
      { status: 403 }
    )
  }

  try {
    // Fetch session details for email notification
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*, mechanic:mechanic_id(*), customer:customer_user_id(*)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if summary already submitted
    if ((session as any).summary_submitted_at) {
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
            // Insert file record (use DB column names)
            const { data: fileRecord } = await supabaseAdmin
              .from('session_files')
              .insert({
                session_id: sessionId,
                uploaded_by: participant.userId,
                file_name: photo.name,
                file_type: photo.type,
                file_size: photo.size,
                storage_path: storagePath,
              } as any)
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
      .update(({
        summary_data: summaryData,
        summary_submitted_at: new Date().toISOString(),
      } as any))
      .eq('id', sessionId)

    if (updateError) {
      console.error('Failed to update session with summary:', updateError)
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      )
    }

    // Log summary submission
    await logInfo(('session.summary_submitted' as any), `Summary submitted for session ${sessionId}`, {
      sessionId,
      mechanicId: participant.userId,
      customerId: (session as any).customer_user_id,
      hasPhotos: photoUrls.length > 0,
    } as any)

    // Send email to customer using new branded template
    try {
      const { sendSummaryDeliveredEmail } = await import('@/lib/email/templates')

      await sendSummaryDeliveredEmail({
        sessionId,
        customerEmail: (session as any).customer?.email || '',
        customerName: (session as any).customer?.full_name || 'Customer',
        mechanicName: (session as any).mechanic?.full_name || 'Your Mechanic',
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

  // Validate session participant FIRST
  const authResult = await requireSessionParticipantRelaxed(req, sessionId)
  if (authResult.error) return authResult.error

  const participant = authResult.data
  console.log(`[GET /sessions/${sessionId}/summary] ${participant.role} accessing summary for session ${participant.sessionId}`)

  try {
    // Get session with summary
    const { data: session, error } = await supabaseAdmin
      .from('sessions')
      .select('summary_data, summary_submitted_at, mechanic_id, customer_user_id')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!(session as any).summary_submitted_at) {
      return NextResponse.json({ error: 'Summary not yet submitted' }, { status: 404 })
    }

    return NextResponse.json({
      summary: (session as any).summary_data,
      submitted_at: (session as any).summary_submitted_at,
    })
  } catch (error: any) {
    console.error('[Get Summary] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


