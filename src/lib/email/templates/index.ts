/**
 * Email Templates Index
 * Centralized exports for all email templates
 */

export { sendBookingConfirmedEmail } from './bookingConfirmed'
export type { BookingConfirmedEmailParams } from './bookingConfirmed'

export { sendMechanicAssignedEmail } from './mechanicAssigned'
export type { MechanicAssignedEmailParams } from './mechanicAssigned'

export { sendSessionStartingEmail } from './sessionStarting'
export type { SessionStartingEmailParams } from './sessionStarting'

export { sendSessionEndedEmail } from './sessionEnded'
export type { SessionEndedEmailParams } from './sessionEnded'

export { sendSummaryDeliveredEmail } from './summaryDelivered'
export type { SummaryDeliveredEmailParams } from './summaryDelivered'

export { sendWaitlistJoinedEmail } from './waitlistJoined'
export type { WaitlistJoinedEmailParams } from './waitlistJoined'

export { sendMechanicOnlineAlertEmail } from './mechanicOnlineAlert'
export type { MechanicOnlineAlertEmailParams } from './mechanicOnlineAlert'
