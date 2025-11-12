/**
 * Calendar Invite Generation (ICS Format)
 *
 * Generates .ics (iCalendar) files that customers can add to their calendar apps
 * Compatible with: Google Calendar, Outlook, Apple Calendar, etc.
 */

interface CalendarInviteData {
  sessionId: string
  customerName: string
  customerEmail: string
  mechanicName: string
  sessionType: 'video' | 'diagnostic'
  scheduledFor: Date
  durationMinutes?: number
  description?: string
  location?: string
}

/**
 * Format date for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

/**
 * Escape special characters for iCalendar format
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

/**
 * Generate calendar invite (.ics file content)
 */
export function generateCalendarInvite(data: CalendarInviteData): string {
  const {
    sessionId,
    customerName,
    customerEmail,
    mechanicName,
    sessionType,
    scheduledFor,
    durationMinutes = 45,
    description,
    location
  } = data

  // Calculate end time
  const endTime = new Date(scheduledFor.getTime() + durationMinutes * 60 * 1000)

  // Current timestamp for created/modified fields
  const now = new Date()

  // Session details
  const sessionTypeText = sessionType === 'video' ? 'Online Video Session' : 'In-Person Workshop Visit'
  const sessionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/customer/sessions/${sessionId}`

  // Build description
  let fullDescription = `${sessionTypeText} with ${mechanicName}\\n\\n`

  if (description) {
    fullDescription += `Service Details:\\n${escapeICalText(description)}\\n\\n`
  }

  if (sessionType === 'video') {
    fullDescription += `This is an online video session. Join via TheAutoDoctor platform.\\n\\n`
  } else {
    fullDescription += `This is an in-person workshop visit.\\n\\n`
  }

  fullDescription += `Session Link: ${sessionUrl}\\n\\n`
  fullDescription += `Important: You must sign the session waiver before joining.\\n\\n`
  fullDescription += `Questions? Contact us at support@theautodoctor.com`

  // Determine location
  let eventLocation = location || ''
  if (sessionType === 'video') {
    eventLocation = 'Online (TheAutoDoctor Platform)'
  } else if (!eventLocation) {
    eventLocation = `Workshop - ${mechanicName}`
  }

  // Generate unique ID for the event
  const eventId = `${sessionId}@theautodoctor.com`

  // Build ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TheAutoDoctor//Session Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${eventId}`,
    `DTSTAMP:${formatICalDate(now)}`,
    `DTSTART:${formatICalDate(scheduledFor)}`,
    `DTEND:${formatICalDate(endTime)}`,
    `SUMMARY:${escapeICalText(`Auto Service: ${sessionTypeText}`)}`,
    `DESCRIPTION:${fullDescription}`,
    `LOCATION:${escapeICalText(eventLocation)}`,
    `ORGANIZER;CN=${escapeICalText(mechanicName)}:mailto:noreply@theautodoctor.com`,
    `ATTENDEE;CN=${escapeICalText(customerName)};RSVP=TRUE:mailto:${customerEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Auto service session tomorrow',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Auto service session in 1 hour',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Auto service session in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return icsContent
}

/**
 * Generate calendar invite as Buffer (for email attachment)
 */
export function generateCalendarInviteBuffer(data: CalendarInviteData): Buffer {
  const icsContent = generateCalendarInvite(data)
  return Buffer.from(icsContent, 'utf-8')
}

/**
 * Generate calendar invite filename
 */
export function generateCalendarInviteFilename(sessionId: string): string {
  return `theautodoctor-session-${sessionId}.ics`
}

/**
 * Example usage:
 *
 * // In confirmation email API
 * const inviteBuffer = generateCalendarInviteBuffer({
 *   sessionId: session.id,
 *   customerName: customer.full_name,
 *   customerEmail: customer.email,
 *   mechanicName: mechanic.full_name,
 *   sessionType: session.type,
 *   scheduledFor: new Date(session.scheduled_for),
 *   description: intake.concern_description
 * })
 *
 * await sendEmail({
 *   to: customer.email,
 *   subject: 'Session Confirmed',
 *   html: confirmationEmailHtml,
 *   attachments: [
 *     {
 *       filename: generateCalendarInviteFilename(session.id),
 *       content: inviteBuffer,
 *       contentType: 'text/calendar; charset=utf-8; method=REQUEST'
 *     }
 *   ]
 * })
 */
