// @ts-nocheck
/**
 * Beta Program Tracker API
 * Returns progress metrics for the workshop beta program
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ensureAdmin } from '@/lib/auth'

// Beta program configuration
const BETA_CONFIG = {
  MIN_WORKSHOPS: 3,
  TARGET_WORKSHOPS: 5,
  MIN_MECHANICS_PER_WORKSHOP: 1,
  MIN_HEALTH_SCORE: 60,
  START_DATE: '2025-01-01', // Adjust as needed
  TARGET_DATE: '2025-03-01', // Adjust as needed
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const adminCheck = await ensureAdmin()
    if (!adminCheck.ok) return adminCheck.res

    // Fetch all workshops
    const { data: workshops } = await supabaseAdmin
      .from('organizations')
      .select('id, name, status, created_at, approved_at')
      .eq('organization_type', 'workshop')
      .order('created_at', { ascending: true })

    // Count workshops by status
    const workshopStats = {
      active: workshops?.filter(w => w.status === 'active').length || 0,
      pending: workshops?.filter(w => w.status === 'pending').length || 0,
      suspended: workshops?.filter(w => w.status === 'suspended').length || 0,
    }

    // Fetch mechanics for active workshops
    const activeWorkshopIds = workshops
      ?.filter(w => w.status === 'active')
      .map(w => w.id) || []

    const workshopMechanics = new Map()
    if (activeWorkshopIds.length > 0) {
      const { data: mechanics } = await supabaseAdmin
        .from('mechanics')
        .select('workshop_id')
        .in('workshop_id', activeWorkshopIds)

      mechanics?.forEach(m => {
        const count = workshopMechanics.get(m.workshop_id) || 0
        workshopMechanics.set(m.workshop_id, count + 1)
      })
    }

    const workshopsWithMechanics = Array.from(workshopMechanics.keys()).length

    // Calculate health scores for workshops
    const workshopHealthScores = new Map()
    let readyWorkshops = 0

    for (const workshop of workshops?.filter(w => w.status === 'active') || []) {
      const mechanicsCount = workshopMechanics.get(workshop.id) || 0
      const healthScore = calculateWorkshopHealth(workshop, mechanicsCount)
      workshopHealthScores.set(workshop.id, healthScore)

      // Check if workshop meets beta criteria
      if (
        mechanicsCount >= BETA_CONFIG.MIN_MECHANICS_PER_WORKSHOP &&
        healthScore >= BETA_CONFIG.MIN_HEALTH_SCORE
      ) {
        readyWorkshops++
      }
    }

    // Get top performing workshops
    const topWorkshops = workshops
      ?.filter(w => w.status === 'active')
      .map(w => ({
        id: w.id,
        name: w.name,
        mechanics: workshopMechanics.get(w.id) || 0,
        healthScore: workshopHealthScores.get(w.id) || 0,
      }))
      .sort((a, b) => {
        // Sort by health score, then by mechanics count
        if (b.healthScore !== a.healthScore) {
          return b.healthScore - a.healthScore
        }
        return b.mechanics - a.mechanics
      })
      .slice(0, 3) || []

    // Calculate milestones
    const milestones = [
      {
        id: 'first_workshop',
        title: 'First Workshop',
        description: 'Get your first workshop signed up',
        target: 1,
        current: workshopStats.active,
        completed: workshopStats.active >= 1,
        completedAt: workshops?.find(w => w.status === 'active')?.approved_at,
      },
      {
        id: 'min_workshops',
        title: 'Minimum Beta Size',
        description: `Reach ${BETA_CONFIG.MIN_WORKSHOPS} active workshops`,
        target: BETA_CONFIG.MIN_WORKSHOPS,
        current: workshopStats.active,
        completed: workshopStats.active >= BETA_CONFIG.MIN_WORKSHOPS,
        completedAt: workshops
          ?.filter(w => w.status === 'active')
          .sort((a, b) => new Date(a.approved_at).getTime() - new Date(b.approved_at).getTime())
          [BETA_CONFIG.MIN_WORKSHOPS - 1]?.approved_at,
        critical: true,
      },
      {
        id: 'target_workshops',
        title: 'Target Beta Size',
        description: `Reach ${BETA_CONFIG.TARGET_WORKSHOPS} active workshops`,
        target: BETA_CONFIG.TARGET_WORKSHOPS,
        current: workshopStats.active,
        completed: workshopStats.active >= BETA_CONFIG.TARGET_WORKSHOPS,
        completedAt: workshops
          ?.filter(w => w.status === 'active')
          .sort((a, b) => new Date(a.approved_at).getTime() - new Date(b.approved_at).getTime())
          [BETA_CONFIG.TARGET_WORKSHOPS - 1]?.approved_at,
      },
      {
        id: 'all_have_mechanics',
        title: 'All Workshops Staffed',
        description: 'Every workshop has at least 1 mechanic',
        target: workshopStats.active,
        current: workshopsWithMechanics,
        completed: workshopsWithMechanics === workshopStats.active && workshopStats.active > 0,
        critical: true,
      },
      {
        id: 'beta_ready',
        title: 'Beta Ready Workshops',
        description: `Workshops meeting all beta criteria (health ≥${BETA_CONFIG.MIN_HEALTH_SCORE})`,
        target: BETA_CONFIG.MIN_WORKSHOPS,
        current: readyWorkshops,
        completed: readyWorkshops >= BETA_CONFIG.MIN_WORKSHOPS,
      },
    ]

    // Calculate readiness score
    let readinessScore = 0
    const readinessFactors = [
      { weight: 40, achieved: workshopStats.active >= BETA_CONFIG.MIN_WORKSHOPS },
      { weight: 30, achieved: workshopsWithMechanics === workshopStats.active && workshopStats.active > 0 },
      { weight: 20, achieved: readyWorkshops >= BETA_CONFIG.MIN_WORKSHOPS },
      { weight: 10, achieved: workshopStats.pending === 0 }, // No backlog
    ]

    readinessFactors.forEach(factor => {
      if (factor.achieved) {
        readinessScore += factor.weight
      }
    })

    // Determine program status
    let programStatus: 'not_started' | 'in_progress' | 'ready' | 'launched'
    if (workshopStats.active === 0) {
      programStatus = 'not_started'
    } else if (readinessScore >= 90) {
      programStatus = 'ready'
    } else {
      programStatus = 'in_progress'
    }

    // Identify blockers
    const blockers = []
    if (workshopStats.active < BETA_CONFIG.MIN_WORKSHOPS) {
      blockers.push(`Need ${BETA_CONFIG.MIN_WORKSHOPS - workshopStats.active} more active workshops`)
    }
    if (workshopsWithMechanics < workshopStats.active && workshopStats.active > 0) {
      blockers.push(`${workshopStats.active - workshopsWithMechanics} workshops need mechanics`)
    }
    if (workshopStats.pending > 5) {
      blockers.push(`${workshopStats.pending} applications pending approval`)
    }
    if (readyWorkshops < BETA_CONFIG.MIN_WORKSHOPS) {
      blockers.push(`Only ${readyWorkshops} workshops meet health criteria`)
    }

    // Suggest next steps
    const nextSteps = []
    if (workshopStats.pending > 0) {
      nextSteps.push(`Review and approve ${workshopStats.pending} pending applications`)
    }
    if (workshopStats.active < BETA_CONFIG.TARGET_WORKSHOPS) {
      nextSteps.push(`Recruit ${BETA_CONFIG.TARGET_WORKSHOPS - workshopStats.active} more workshops`)
    }
    if (workshopsWithMechanics < workshopStats.active && workshopStats.active > 0) {
      nextSteps.push('Help workshops invite mechanics')
    }
    if (readinessScore >= 90) {
      nextSteps.push('Prepare beta launch announcement')
      nextSteps.push('Set up beta program benefits')
    }

    return NextResponse.json({
      success: true,
      data: {
        status: programStatus,
        startDate: BETA_CONFIG.START_DATE,
        targetDate: BETA_CONFIG.TARGET_DATE,
        workshops: {
          active: workshopStats.active,
          withMechanics: workshopsWithMechanics,
          target: BETA_CONFIG.TARGET_WORKSHOPS,
          ready: readyWorkshops,
        },
        milestones,
        readinessScore,
        blockers,
        nextSteps,
        topWorkshops,
      },
    })
  } catch (error: any) {
    console.error('[ANALYTICS] Error fetching beta program data:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate workshop health score
function calculateWorkshopHealth(workshop: any, mechanicsCount: number): number {
  let score = 100

  // Deduct for no mechanics
  if (mechanicsCount === 0) {
    score -= 40
  } else if (mechanicsCount < 3) {
    score -= 20
  }

  // Deduct for age without activity (simplified)
  const daysSinceApproval = workshop.approved_at
    ? Math.floor((Date.now() - new Date(workshop.approved_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  if (daysSinceApproval > 30 && mechanicsCount === 0) {
    score -= 30
  }

  return Math.max(0, score)
}