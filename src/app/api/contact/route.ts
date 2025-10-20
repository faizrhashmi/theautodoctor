import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

const ACCEPTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf'])
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_BUCKET = 'contact-uploads'

type FieldErrors = Partial<Record<'name' | 'email' | 'reason' | 'subject' | 'message' | 'attachment', string>>

type ErrorResponse = {
  error: string
  fieldErrors?: FieldErrors
}

type SuccessResponse = {
  message: string
}

const badRequest = (body: ErrorResponse) => NextResponse.json(body, { status: 400 })
const serverError = (body: ErrorResponse) => NextResponse.json(body, { status: 500 })

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch (error) {
    console.error('Invalid form submission payload', error)
    return badRequest({ error: 'Invalid form submission.' })
  }

  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()
  const message = String(formData.get('message') ?? '').trim()
  const file = formData.get('attachment')

  const fieldErrors: FieldErrors = {}

  if (!name) {
    fieldErrors.name = 'Name is required.'
  }

  if (!email || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = 'A valid email address is required.'
  }

  if (!reason) {
    fieldErrors.reason = 'Select a reason so we can route your request.'
  }

  if (!subject) {
    fieldErrors.subject = 'Subject is required.'
  }

  if (!message || message.length < 20) {
    fieldErrors.message = 'Please include at least 20 characters so we can assist you.'
  }

  let attachmentBuffer: Buffer | null = null
  let attachmentFileName: string | null = null
  let attachmentContentType: string | null = null

  if (file instanceof File && file.size > 0) {
    attachmentFileName = file.name
    attachmentContentType = file.type

    if (!ACCEPTED_MIME_TYPES.has(file.type)) {
      fieldErrors.attachment = 'Only PNG, JPG or PDF files are supported.'
    } else if (file.size > MAX_FILE_SIZE_BYTES) {
      fieldErrors.attachment = 'File must be 10 MB or smaller.'
    } else {
      const arrayBuffer = await file.arrayBuffer()
      attachmentBuffer = Buffer.from(arrayBuffer)
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return badRequest({ error: 'Validation failed.', fieldErrors })
  }

  let attachmentPath: string | null = null
  let attachmentSignedUrl: string | null = null

  if (attachmentBuffer && attachmentFileName && attachmentContentType) {
    const sanitizedName = attachmentFileName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')

    attachmentPath = `contact/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${sanitizedName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(CONTACT_BUCKET)
      .upload(attachmentPath, attachmentBuffer, {
        contentType: attachmentContentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Failed to upload contact attachment', uploadError)
      return serverError({ error: 'Unable to upload attachment. Please try again.' })
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(CONTACT_BUCKET)
      .createSignedUrl(attachmentPath, 60 * 60 * 24 * 7)

    if (signedUrlError) {
      console.error('Failed to create signed URL for attachment', signedUrlError)
    } else {
      attachmentSignedUrl = signedUrlData?.signedUrl ?? null
    }
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('contact_requests')
    .insert({
      name,
      email,
      reason,
      subject,
      message,
      attachment_path: attachmentPath,
      attachment_url: attachmentSignedUrl,
    })
    .select()
    .single()

  if (insertError || !inserted) {
    console.error('Failed to create contact request', insertError)
    return serverError({ error: 'Unable to save your request. Please try again.' })
  }

  const resendKey = process.env.RESEND_API_KEY
  const supportRecipients = process.env.CONTACT_ALERT_RECIPIENTS
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'AskAutoDoctor Support <support@theautodoctor.com>'

  if (resendKey && supportRecipients) {
    try {
      const resend = new Resend(resendKey)
      const supportEmails = supportRecipients
        .split(',')
        .map((emailAddress) => emailAddress.trim())
        .filter(Boolean)

      if (supportEmails.length > 0) {
        const summaryLines = [
          `New contact request submitted`,
          '',
          `Name: ${name}`,
          `Email: ${email}`,
          `Reason: ${reason}`,
          `Subject: ${subject}`,
          '',
          'Message:',
          message,
          '',
          attachmentSignedUrl ? `Attachment: ${attachmentSignedUrl}` : 'Attachment: none provided',
          `Created: ${new Date(inserted.created_at).toISOString()}`,
        ]

        await resend.emails.send({
          from: fromEmail,
          to: supportEmails,
          subject: `New contact request: ${subject}`,
          text: summaryLines.join('\n'),
        })
      }

      const confirmationFrom = process.env.CONTACT_CONFIRMATION_FROM_EMAIL ?? fromEmail
      await resend.emails.send({
        from: confirmationFrom,
        to: email,
        subject: 'We received your message',
        text: [
          `Hi ${name || 'there'},`,
          '',
          'Thanks for reaching out to AskAutoDoctor. Our support team has received your message and will reply within one business day.',
          '',
          `Subject: ${subject}`,
          `Reason: ${reason}`,
          '',
          'If you need to add more details, just reply to this email and include any reference number we send back.',
          '',
          '— AskAutoDoctor Support Team',
        ].join('\n'),
      })
    } catch (error) {
      console.error('Failed to send contact notification email', error)
    }
  }

  const response: SuccessResponse = {
    message: 'Thank you for contacting us. We will get back to you shortly.'
  }

  return NextResponse.json(response, { status: 200 })
}
