/**
 * CRM Tracking and Upsell Recommendation Service
 *
 * Provides utilities for tracking customer interactions across the conversion funnel
 * and generating personalized upsell recommendations based on session data.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

type CrmInteractionType =
  | 'intake_submitted'
  | 'session_started'
  | 'session_completed'
  | 'summary_viewed'
  | 'upsell_shown'
  | 'upsell_clicked'
  | 'upsell_dismissed'
  | 'follow_up_created'
  | 'waiver_accepted'
  | 'checkout_started'
  | 'checkout_completed'

type UpsellRecommendationType =
  | 'follow_up'
  | 'maintenance_plan'
  | 'premium_upgrade'
  | 'diagnostic_package'
  | 'video_session'

export interface TrackInteractionParams {
  customerId: string
  interactionType: CrmInteractionType
  sessionId?: string
  metadata?: Record<string, any>
}

export interface CreateUpsellParams {
  customerId: string
  sessionId: string
  recommendationType: UpsellRecommendationType
  serviceTitle: string
  serviceDescription?: string
  priceCents?: number
  metadata?: Record<string, any>
}

export interface UpsellRecommendation {
  id: string
  customer_id: string | null
  session_id: string | null
  recommendation_type: string
  service_title: string
  service_description: string | null
  price_cents: number | null
  shown_at: string | null
  clicked_at: string | null
  purchased_at: string | null
  dismissed_at: string | null
  metadata: any
  created_at: string
}

/**
 * Track a customer interaction in the CRM system
 */
export async function trackInteraction({
  customerId,
  interactionType,
  sessionId,
  metadata = {},
}: TrackInteractionParams): Promise<{ success: boolean; error?: string; id?: string }> {
  try {

    const { data, error } = await supabaseAdmin.rpc('track_crm_interaction', {
      p_customer_id: customerId,
      p_interaction_type: interactionType,
      p_session_id: sessionId || null,
      p_metadata: metadata as any,
    })

    if (error) {
      console.error('[CRM] Failed to track interaction:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data }
  } catch (err) {
    console.error('[CRM] Exception tracking interaction:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Create an upsell recommendation for a customer
 */
export async function createUpsellRecommendation({
  customerId,
  sessionId,
  recommendationType,
  serviceTitle,
  serviceDescription,
  priceCents,
  metadata = {},
}: CreateUpsellParams): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('create_upsell_recommendation', {
      p_customer_id: customerId,
      p_session_id: sessionId,
      p_recommendation_type: recommendationType,
      p_service_title: serviceTitle,
      p_service_description: serviceDescription || null,
      p_price_cents: priceCents || null,
      p_metadata: metadata as any,
    })

    if (error) {
      console.error('[CRM] Failed to create upsell:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data }
  } catch (err) {
    console.error('[CRM] Exception creating upsell:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get upsell recommendations for a session
 */
export async function getSessionUpsells(sessionId: string): Promise<{
  success: boolean
  error?: string
  data?: UpsellRecommendation[]
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('upsell_recommendations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[CRM] Failed to fetch upsells:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as UpsellRecommendation[] }
  } catch (err) {
    console.error('[CRM] Exception fetching upsells:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Mark an upsell as shown to the customer
 */
export async function markUpsellShown(upsellId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('upsell_recommendations')
      .update({ shown_at: new Date().toISOString() })
      .eq('id', upsellId)
      .is('shown_at', null)

    if (error) {
      console.error('[CRM] Failed to mark upsell shown:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[CRM] Exception marking upsell shown:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Mark an upsell as clicked by the customer
 */
export async function markUpsellClicked(upsellId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('upsell_recommendations')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', upsellId)
      .is('clicked_at', null)

    if (error) {
      console.error('[CRM] Failed to mark upsell clicked:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[CRM] Exception marking upsell clicked:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Mark an upsell as dismissed by the customer
 */
export async function markUpsellDismissed(upsellId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('upsell_recommendations')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', upsellId)
      .is('dismissed_at', null)

    if (error) {
      console.error('[CRM] Failed to mark upsell dismissed:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[CRM] Exception marking upsell dismissed:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Mark an upsell as purchased
 */
export async function markUpsellPurchased(upsellId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('upsell_recommendations')
      .update({ purchased_at: new Date().toISOString() })
      .eq('id', upsellId)
      .is('purchased_at', null)

    if (error) {
      console.error('[CRM] Failed to mark upsell purchased:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[CRM] Exception marking upsell purchased:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Generate intelligent upsell recommendations based on session data
 */
export async function generateUpsellsForSession(sessionId: string): Promise<{
  success: boolean
  error?: string
  upsellIds?: string[]
}> {
  try {
    // Fetch session details
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return { success: false, error: 'Session not found' }
    }

    if (!session.customer_user_id) {
      return { success: false, error: 'No customer associated with session' }
    }

    const upsellIds: string[] = []

    // Recommendation 1: Follow-up diagnostic if they had a chat/video session
    if (session.type === 'chat' || session.type === 'video') {
      const result = await createUpsellRecommendation({
        customerId: session.customer_user_id,
        sessionId: session.id,
        recommendationType: 'diagnostic_package',
        serviceTitle: 'Full Diagnostic Package',
        serviceDescription:
          'Get a comprehensive diagnostic assessment for your vehicle. Perfect for deeper issues that need hands-on investigation.',
        priceCents: 9900,
        metadata: {
          previous_session_type: session.type,
          auto_generated: true,
        },
      })

      if (result.success && result.id) {
        upsellIds.push(result.id)
      }
    }

    // Recommendation 2: Follow-up session for continued support
    const followUpResult = await createUpsellRecommendation({
      customerId: session.customer_user_id,
      sessionId: session.id,
      recommendationType: 'follow_up',
      serviceTitle: 'Follow-up Session',
      serviceDescription:
        "Have more questions? Book a follow-up session to continue where we left off. We'll have your vehicle history ready.",
      priceCents: session.plan === 'trial' ? 2500 : 4900,
      metadata: {
        previous_plan: session.plan,
        auto_generated: true,
      },
    })

    if (followUpResult.success && followUpResult.id) {
      upsellIds.push(followUpResult.id)
    }

    // Recommendation 3: Video upgrade if they only had chat
    if (session.type === 'chat') {
      const videoResult = await createUpsellRecommendation({
        customerId: session.customer_user_id,
        sessionId: session.id,
        recommendationType: 'video_session',
        serviceTitle: 'Video Session Upgrade',
        serviceDescription:
          'Get visual guidance from a mechanic. Perfect for showing the problem and getting real-time demonstrations.',
        priceCents: 4900,
        metadata: {
          previous_session_type: 'chat',
          auto_generated: true,
        },
      })

      if (videoResult.success && videoResult.id) {
        upsellIds.push(videoResult.id)
      }
    }

    return { success: true, upsellIds }
  } catch (err) {
    console.error('[CRM] Exception generating upsells:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get customer interaction history
 */
export async function getCustomerInteractions(customerId: string, limit = 50): Promise<{
  success: boolean
  error?: string
  data?: Array<{
    id: string
    interaction_type: string
    session_id: string | null
    metadata: any
    created_at: string
  }>
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('crm_interactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[CRM] Failed to fetch interactions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[CRM] Exception fetching interactions:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * Get conversion funnel metrics for a customer
 */
export async function getCustomerFunnelMetrics(customerId: string): Promise<{
  success: boolean
  error?: string
  metrics?: {
    total_intakes: number
    sessions_started: number
    sessions_completed: number
    upsells_shown: number
    upsells_clicked: number
    upsells_purchased: number
    conversion_rate: number
  }
}> {
  try {
    // Get interaction counts
    const { data: interactions, error } = await supabaseAdmin
      .from('crm_interactions')
      .select('interaction_type')
      .eq('customer_id', customerId)

    if (error) {
      return { success: false, error: error.message }
    }

    const total_intakes = interactions?.filter((i: any) => i.interaction_type === 'intake_submitted').length || 0
    const sessions_started = interactions?.filter((i: any) => i.interaction_type === 'session_started').length || 0
    const sessions_completed = interactions?.filter((i: any) => i.interaction_type === 'session_completed').length || 0
    const upsells_shown = interactions?.filter((i: any) => i.interaction_type === 'upsell_shown').length || 0
    const upsells_clicked = interactions?.filter((i: any) => i.interaction_type === 'upsell_clicked').length || 0

    // Get upsell purchase count
    const { data: upsells } = await supabaseAdmin
      .from('upsell_recommendations')
      .select('purchased_at')
      .eq('customer_id', customerId)
      .not('purchased_at', 'is', null)

    const upsells_purchased = upsells?.length || 0

    const conversion_rate = total_intakes > 0 ? (sessions_completed / total_intakes) * 100 : 0

    return {
      success: true,
      metrics: {
        total_intakes,
        sessions_started,
        sessions_completed,
        upsells_shown,
        upsells_clicked,
        upsells_purchased,
        conversion_rate,
      },
    }
  } catch (err) {
    console.error('[CRM] Exception calculating funnel metrics:', err)
    return { success: false, error: String(err) }
  }
}
