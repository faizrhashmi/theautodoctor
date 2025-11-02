/**
 * RFQ Notification Helpers
 *
 * Functions for sending email and SMS notifications for RFQ events
 *
 * @module lib/rfq/notifications
 */

import { createClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Notification types for RFQ events
 */
export enum RfqNotificationType {
  // Workshop notifications
  NEW_RFQ_POSTED = 'new_rfq_posted',
  RFQ_EXPIRING_SOON = 'rfq_expiring_soon',
  BID_ACCEPTED = 'bid_accepted',
  BID_REJECTED = 'bid_rejected',

  // Customer notifications
  NEW_BID_RECEIVED = 'new_bid_received',
  ALL_BIDS_RECEIVED = 'all_bids_received',
  BID_ACCEPTED_CUSTOMER = 'bid_accepted_customer',

  // Mechanic notifications
  BID_ACCEPTED_MECHANIC = 'bid_accepted_mechanic',
  NEW_BID_RECEIVED_MECHANIC = 'new_bid_received_mechanic',
}

/**
 * Email template data
 */
interface EmailTemplateData {
  to: string
  subject: string
  html: string
  text: string
}

/**
 * SMS template data
 */
interface SmsTemplateData {
  to: string
  message: string
}

/**
 * Send email notification (placeholder - integrate with email service)
 */
export async function sendEmail(data: EmailTemplateData): Promise<boolean> {
  try {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    console.log('[RFQ Email Notification]', {
      to: data.to,
      subject: data.subject,
      preview: data.text.substring(0, 100)
    })

    // For now, just log and return success
    // In production, call your email service API here
    return true
  } catch (error) {
    console.error('Email notification failed:', error)
    return false
  }
}

/**
 * Send SMS notification (placeholder - integrate with SMS service)
 */
export async function sendSms(data: SmsTemplateData): Promise<boolean> {
  try {
    // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
    console.log('[RFQ SMS Notification]', {
      to: data.to,
      preview: data.message.substring(0, 50)
    })

    // For now, just log and return success
    // In production, call your SMS service API here
    return true
  } catch (error) {
    console.error('SMS notification failed:', error)
    return false
  }
}

/**
 * Get user profile with notification preferences
 */
async function getUserProfile(userId: string) {
  const supabase = createClient({ cookies })

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, phone, notification_preferences')
    .eq('id', userId)
    .single()

  return profile
}

/**
 * Notify workshop about new RFQ posted
 */
export async function notifyWorkshopNewRfq(params: {
  workshopId: string
  rfqId: string
  rfqTitle: string
  vehicleInfo: string
  budgetRange?: string
  bidDeadline: string
}) {
  try {
    // Get workshop admin/owner users
    const supabase = createClient({ cookies })
    const { data: workshopUsers } = await supabase
      .from('workshop_roles')
      .select('user_id, profiles!inner(email, phone)')
      .eq('workshop_id', params.workshopId)
      .in('role', ['owner', 'admin', 'service_advisor'])
      .eq('can_send_quotes', true)

    if (!workshopUsers || workshopUsers.length === 0) return

    const emailPromises = workshopUsers.map(user => {
      const profile = user.profiles as any
      return sendEmail({
        to: profile.email,
        subject: `New RFQ: ${params.rfqTitle}`,
        html: `
          <h2>New RFQ Available</h2>
          <p>A new repair request has been posted that matches your workshop's criteria:</p>
          <ul>
            <li><strong>Request:</strong> ${params.rfqTitle}</li>
            <li><strong>Vehicle:</strong> ${params.vehicleInfo}</li>
            ${params.budgetRange ? `<li><strong>Budget:</strong> ${params.budgetRange}</li>` : ''}
            <li><strong>Bid Deadline:</strong> ${params.bidDeadline}</li>
          </ul>
          <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/workshop/rfq/marketplace/${params.rfqId}">View RFQ & Submit Bid</a></p>
        `,
        text: `New RFQ: ${params.rfqTitle}\nVehicle: ${params.vehicleInfo}\nBid Deadline: ${params.bidDeadline}\nView: ${process.env.NEXT_PUBLIC_BASE_URL}/workshop/rfq/marketplace/${params.rfqId}`
      })
    })

    await Promise.all(emailPromises)
  } catch (error) {
    console.error('Failed to notify workshop of new RFQ:', error)
  }
}

/**
 * Notify customer of new bid received
 */
export async function notifyCustomerNewBid(params: {
  customerId: string
  rfqId: string
  rfqTitle: string
  workshopName: string
  bidAmount: number
  totalBids: number
  maxBids: number
}) {
  try {
    const profile = await getUserProfile(params.customerId)
    if (!profile) return

    await sendEmail({
      to: profile.email,
      subject: `New Bid Received: ${params.workshopName}`,
      html: `
        <h2>New Bid on Your RFQ</h2>
        <p><strong>${params.workshopName}</strong> has submitted a bid on your repair request:</p>
        <ul>
          <li><strong>Request:</strong> ${params.rfqTitle}</li>
          <li><strong>Bid Amount:</strong> $${params.bidAmount.toLocaleString()}</li>
          <li><strong>Total Bids:</strong> ${params.totalBids} of ${params.maxBids}</li>
        </ul>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/bids">Compare All Bids</a></p>
      `,
      text: `New bid from ${params.workshopName}: $${params.bidAmount.toLocaleString()}\nTotal bids: ${params.totalBids}/${params.maxBids}\nView: ${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/bids`
    })

    // Send SMS if enabled
    if (profile.phone) {
      await sendSms({
        to: profile.phone,
        message: `New bid on your ${params.rfqTitle}: $${params.bidAmount.toLocaleString()} from ${params.workshopName}. View all bids: ${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/bids`
      })
    }
  } catch (error) {
    console.error('Failed to notify customer of new bid:', error)
  }
}

/**
 * Notify mechanic of new bid received (referral tracking)
 */
export async function notifyMechanicNewBid(params: {
  mechanicId: string
  rfqId: string
  rfqTitle: string
  workshopName: string
  bidAmount: number
  totalBids: number
}) {
  try {
    const profile = await getUserProfile(params.mechanicId)
    if (!profile) return

    const referralFee = (params.bidAmount * 5) / 100

    await sendEmail({
      to: profile.email,
      subject: `New Bid on Your RFQ: ${params.workshopName}`,
      html: `
        <h2>New Bid on Your RFQ</h2>
        <p><strong>${params.workshopName}</strong> has bid on your escalated RFQ:</p>
        <ul>
          <li><strong>Request:</strong> ${params.rfqTitle}</li>
          <li><strong>Bid Amount:</strong> $${params.bidAmount.toLocaleString()}</li>
          <li><strong>Total Bids:</strong> ${params.totalBids}</li>
          <li><strong>Potential Referral Fee:</strong> $${referralFee.toFixed(2)} (5%)</li>
        </ul>
        <p>Your customer will review all bids and select the best option.</p>
      `,
      text: `New bid from ${params.workshopName}: $${params.bidAmount.toLocaleString()}\nPotential referral fee: $${referralFee.toFixed(2)}`
    })
  } catch (error) {
    console.error('Failed to notify mechanic of new bid:', error)
  }
}

/**
 * Notify all parties of bid acceptance
 */
export async function notifyBidAccepted(params: {
  customerId: string
  mechanicId: string
  workshopId: string
  rfqId: string
  bidId: string
  rfqTitle: string
  workshopName: string
  bidAmount: number
  referralFee: number
}) {
  try {
    // Notify customer
    const customerProfile = await getUserProfile(params.customerId)
    if (customerProfile) {
      await sendEmail({
        to: customerProfile.email,
        subject: `Bid Accepted: ${params.workshopName}`,
        html: `
          <h2>Your Bid Selection Confirmed</h2>
          <p>You've accepted the bid from <strong>${params.workshopName}</strong>:</p>
          <ul>
            <li><strong>Request:</strong> ${params.rfqTitle}</li>
            <li><strong>Amount:</strong> $${params.bidAmount.toLocaleString()}</li>
          </ul>
          <h3>Next Steps:</h3>
          <ol>
            <li>The workshop will contact you within 24 hours</li>
            <li>They'll create a formal quote in their system</li>
            <li>You'll schedule a convenient repair time</li>
          </ol>
          <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/accepted">View Details</a></p>
        `,
        text: `Bid accepted from ${params.workshopName}: $${params.bidAmount.toLocaleString()}\nThey will contact you within 24 hours.`
      })
    }

    // Notify mechanic about referral fee
    const mechanicProfile = await getUserProfile(params.mechanicId)
    if (mechanicProfile) {
      await sendEmail({
        to: mechanicProfile.email,
        subject: `Referral Fee Earned: $${params.referralFee.toFixed(2)}`,
        html: `
          <h2>Congratulations! Referral Fee Earned</h2>
          <p>Your customer has accepted a bid on your RFQ:</p>
          <ul>
            <li><strong>Workshop:</strong> ${params.workshopName}</li>
            <li><strong>Bid Amount:</strong> $${params.bidAmount.toLocaleString()}</li>
            <li><strong>Your Referral Fee:</strong> $${params.referralFee.toFixed(2)} (5%)</li>
          </ul>
          <p>The referral fee will be paid automatically when the repair is completed.</p>
        `,
        text: `Referral fee earned: $${params.referralFee.toFixed(2)} from ${params.workshopName}`
      })
    }

    // Notify workshop
    const supabase = createClient({ cookies })
    const { data: workshopUsers } = await supabase
      .from('workshop_roles')
      .select('user_id, profiles!inner(email)')
      .eq('workshop_id', params.workshopId)
      .in('role', ['owner', 'admin', 'service_advisor'])

    if (workshopUsers) {
      const emailPromises = workshopUsers.map(user => {
        const profile = user.profiles as any
        return sendEmail({
          to: profile.email,
          subject: `Your Bid Was Accepted!`,
          html: `
            <h2>Congratulations! Your Bid Was Accepted</h2>
            <p>The customer has selected your workshop for their repair:</p>
            <ul>
              <li><strong>Request:</strong> ${params.rfqTitle}</li>
              <li><strong>Your Bid:</strong> $${params.bidAmount.toLocaleString()}</li>
            </ul>
            <h3>Next Steps:</h3>
            <ol>
              <li>Contact the customer within 24 hours</li>
              <li>Create a formal quote in your DMS</li>
              <li>Schedule the repair at a convenient time</li>
            </ol>
            <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/workshop/rfq/my-bids">View Bid Details</a></p>
          `,
          text: `Your bid was accepted! Contact customer within 24h. Bid: $${params.bidAmount.toLocaleString()}`
        })
      })

      await Promise.all(emailPromises)
    }
  } catch (error) {
    console.error('Failed to notify parties of bid acceptance:', error)
  }
}

/**
 * Notify workshop of bid rejection
 */
export async function notifyBidRejected(params: {
  workshopId: string
  rfqTitle: string
  bidAmount: number
}) {
  try {
    const supabase = createClient({ cookies })
    const { data: workshopUsers } = await supabase
      .from('workshop_roles')
      .select('user_id, profiles!inner(email)')
      .eq('workshop_id', params.workshopId)
      .in('role', ['owner', 'admin'])

    if (!workshopUsers) return

    const emailPromises = workshopUsers.map(user => {
      const profile = user.profiles as any
      return sendEmail({
        to: profile.email,
        subject: `Bid Not Selected: ${params.rfqTitle}`,
        html: `
          <h2>Bid Update</h2>
          <p>The customer has selected a different workshop for their repair:</p>
          <ul>
            <li><strong>Request:</strong> ${params.rfqTitle}</li>
            <li><strong>Your Bid:</strong> $${params.bidAmount.toLocaleString()}</li>
          </ul>
          <p>Thank you for participating. Keep bidding on new RFQs to grow your business!</p>
          <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/workshop/rfq/marketplace">Browse New RFQs</a></p>
        `,
        text: `Your bid on "${params.rfqTitle}" was not selected. Browse new RFQs at ${process.env.NEXT_PUBLIC_BASE_URL}/workshop/rfq/marketplace`
      })
    })

    await Promise.all(emailPromises)
  } catch (error) {
    console.error('Failed to notify workshop of bid rejection:', error)
  }
}

/**
 * Notify customer that RFQ is expiring soon (24h warning)
 */
export async function notifyRfqExpiringSoon(params: {
  customerId: string
  rfqId: string
  rfqTitle: string
  bidCount: number
  hoursRemaining: number
}) {
  try {
    const profile = await getUserProfile(params.customerId)
    if (!profile) return

    await sendEmail({
      to: profile.email,
      subject: `RFQ Expiring Soon: ${params.rfqTitle}`,
      html: `
        <h2>Your RFQ is Expiring Soon</h2>
        <p>Your repair request has <strong>${params.hoursRemaining} hours</strong> remaining:</p>
        <ul>
          <li><strong>Request:</strong> ${params.rfqTitle}</li>
          <li><strong>Bids Received:</strong> ${params.bidCount}</li>
        </ul>
        ${params.bidCount > 0
          ? `<p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/bids">Compare Bids Now</a></p>`
          : `<p>No bids have been received yet. Consider extending the deadline or adjusting your requirements.</p>`
        }
      `,
      text: `Your RFQ "${params.rfqTitle}" expires in ${params.hoursRemaining}h. Bids: ${params.bidCount}. View: ${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/bids`
    })

    if (profile.phone && params.bidCount > 0) {
      await sendSms({
        to: profile.phone,
        message: `Your RFQ expires in ${params.hoursRemaining}h. You have ${params.bidCount} bids to review. ${process.env.NEXT_PUBLIC_BASE_URL}/customer/rfq/${params.rfqId}/bids`
      })
    }
  } catch (error) {
    console.error('Failed to notify customer of expiring RFQ:', error)
  }
}
