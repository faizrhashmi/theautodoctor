/**
 * RFQ Marketplace Analytics API (Admin Only)
 *
 * Provides comprehensive analytics for RFQ marketplace performance
 *
 * @route GET /api/admin/rfq-analytics
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { requireFeature } from '@/lib/flags'

export async function GET(request: Request) {
  try {
    // Feature flag check
    requireFeature('ENABLE_WORKSHOP_RFQ')

    const supabase = createClient({ cookies })

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check (verify user has admin role)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({
        error: 'Forbidden - Admin access required'
      }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('time_range') || '30' // days
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeRange))

    // Fetch RFQ marketplace analytics
    const { data: rfqAnalytics } = await supabase
      .from('workshop_rfq_marketplace')
      .select('id, status, bid_count, created_at, accepted_at, bid_deadline')
      .gte('created_at', startDate.toISOString())

    if (!rfqAnalytics) {
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    // Calculate metrics
    const totalRfqs = rfqAnalytics.length
    const openRfqs = rfqAnalytics.filter(r => r.status === 'open').length
    const acceptedRfqs = rfqAnalytics.filter(r => r.status === 'bid_accepted' || r.status === 'converted').length
    const expiredRfqs = rfqAnalytics.filter(r => r.status === 'expired').length
    const cancelledRfqs = rfqAnalytics.filter(r => r.status === 'cancelled').length

    const conversionRate = totalRfqs > 0 ? (acceptedRfqs / totalRfqs) * 100 : 0

    const rfqsWithBids = rfqAnalytics.filter(r => r.bid_count > 0).length
    const biddingRate = totalRfqs > 0 ? (rfqsWithBids / totalRfqs) * 100 : 0

    const totalBids = rfqAnalytics.reduce((sum, r) => sum + r.bid_count, 0)
    const avgBidsPerRfq = totalRfqs > 0 ? totalBids / totalRfqs : 0

    // Calculate time to acceptance
    const acceptedRfqsWithTime = rfqAnalytics.filter(r => r.accepted_at && r.created_at)
    const avgTimeToAcceptance = acceptedRfqsWithTime.length > 0
      ? acceptedRfqsWithTime.reduce((sum, r) => {
          const created = new Date(r.created_at).getTime()
          const accepted = new Date(r.accepted_at!).getTime()
          return sum + (accepted - created)
        }, 0) / acceptedRfqsWithTime.length / (1000 * 60 * 60) // Convert to hours
      : 0

    // Fetch bid analytics
    const { data: bidAnalytics } = await supabase
      .from('workshop_rfq_bids')
      .select('id, quote_amount, status, created_at')
      .gte('created_at', startDate.toISOString())

    const totalBidsSubmitted = bidAnalytics?.length || 0
    const acceptedBids = bidAnalytics?.filter(b => b.status === 'accepted').length || 0
    const rejectedBids = bidAnalytics?.filter(b => b.status === 'rejected').length || 0
    const pendingBids = bidAnalytics?.filter(b => b.status === 'pending').length || 0

    const bidAcceptanceRate = totalBidsSubmitted > 0 ? (acceptedBids / totalBidsSubmitted) * 100 : 0

    const avgBidAmount = bidAnalytics && bidAnalytics.length > 0
      ? bidAnalytics.reduce((sum, b) => sum + b.quote_amount, 0) / bidAnalytics.length
      : 0

    // Fetch workshop participation
    const { data: workshopStats } = await supabase
      .from('workshop_rfq_views')
      .select('workshop_id, rfq_marketplace_id, submitted_bid')
      .gte('last_viewed_at', startDate.toISOString())

    const uniqueWorkshopsViewing = new Set(workshopStats?.map(w => w.workshop_id) || []).size
    const workshopsWithBids = new Set(
      workshopStats?.filter(w => w.submitted_bid).map(w => w.workshop_id) || []
    ).size

    const workshopConversionRate = uniqueWorkshopsViewing > 0
      ? (workshopsWithBids / uniqueWorkshopsViewing) * 100
      : 0

    // Fetch daily trends
    const dailyTrends = rfqAnalytics.reduce((acc, rfq) => {
      const date = new Date(rfq.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { date, rfqs_created: 0, bids_received: 0 }
      }
      acc[date].rfqs_created++
      acc[date].bids_received += rfq.bid_count
      return acc
    }, {} as Record<string, { date: string; rfqs_created: number; bids_received: number }>)

    return NextResponse.json({
      time_range_days: parseInt(timeRange),
      generated_at: new Date().toISOString(),

      rfq_metrics: {
        total_rfqs: totalRfqs,
        open: openRfqs,
        accepted: acceptedRfqs,
        expired: expiredRfqs,
        cancelled: cancelledRfqs,
        conversion_rate: parseFloat(conversionRate.toFixed(2)),
        rfqs_with_bids: rfqsWithBids,
        bidding_rate: parseFloat(biddingRate.toFixed(2)),
        avg_bids_per_rfq: parseFloat(avgBidsPerRfq.toFixed(2)),
        avg_time_to_acceptance_hours: parseFloat(avgTimeToAcceptance.toFixed(2)),
      },

      bid_metrics: {
        total_bids: totalBidsSubmitted,
        accepted: acceptedBids,
        rejected: rejectedBids,
        pending: pendingBids,
        acceptance_rate: parseFloat(bidAcceptanceRate.toFixed(2)),
        avg_bid_amount: parseFloat(avgBidAmount.toFixed(2)),
      },

      workshop_metrics: {
        unique_workshops_viewing: uniqueWorkshopsViewing,
        workshops_with_bids: workshopsWithBids,
        workshop_conversion_rate: parseFloat(workshopConversionRate.toFixed(2)),
      },

      daily_trends: Object.values(dailyTrends).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }, { status: 200 })

  } catch (error: unknown) {
    console.error('RFQ analytics error:', error)

    if (error instanceof Error && error.message.includes('not enabled')) {
      return NextResponse.json({
        error: 'RFQ marketplace feature is not enabled'
      }, { status: 404 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
