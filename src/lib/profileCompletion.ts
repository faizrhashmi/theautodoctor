/**
 * Profile Completion System
 * Calculates mechanic profile completion score and determines session acceptance eligibility
 */

import { createClient } from '@/lib/supabase/server'

export interface ProfileCompletion {
  score: number // 0-100
  canAcceptSessions: boolean
  missingFields: MissingField[]
  nextSteps: string[]
  lastCalculated: Date
}

export interface MissingField {
  field: string
  category: string
  required: boolean
  weight: number
}

export interface ProfileRequirement {
  id: string
  field_name: string
  field_category: string
  weight: number
  required_for_general: boolean
  required_for_specialist: boolean
}

/**
 * Calculate profile completion score for a mechanic
 * Minimum 80% required to accept sessions
 */
export async function calculateProfileCompletion(
  mechanicId: string
): Promise<ProfileCompletion> {
  const supabase = await createClient()

  // Get mechanic data
  const { data: mechanic, error: mechanicError } = await supabase
    .from('mechanics')
    .select('*')
    .eq('id', mechanicId)
    .single()

  if (mechanicError || !mechanic) {
    throw new Error(`Failed to fetch mechanic: ${mechanicError?.message}`)
  }

  // Get requirements
  const { data: requirements, error: reqError } = await supabase
    .from('mechanic_profile_requirements')
    .select('*')

  if (reqError) {
    throw new Error(`Failed to fetch requirements: ${reqError.message}`)
  }

  let totalPoints = 0
  let earnedPoints = 0
  const missingFields: MissingField[] = []

  requirements?.forEach((req: ProfileRequirement) => {
    const isRequired = mechanic.is_brand_specialist
      ? req.required_for_specialist
      : req.required_for_general

    if (!isRequired) return

    totalPoints += req.weight

    // Check if field is filled
    const isFilled = checkFieldCompletion(req.field_name, mechanic)

    if (isFilled) {
      earnedPoints += req.weight
    } else {
      missingFields.push({
        field: req.field_name,
        category: req.field_category,
        required: isRequired,
        weight: req.weight
      })
    }
  })

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

  // Minimum 80% required to accept sessions
  const canAcceptSessions = score >= 80

  // Update mechanic record
  const { error: updateError } = await supabase
    .from('mechanics')
    .update({
      profile_completion_score: score,
      can_accept_sessions: canAcceptSessions,
      updated_at: new Date().toISOString()
    })
    .eq('id', mechanicId)

  if (updateError) {
    console.error('Failed to update mechanic completion score:', updateError)
  }

  return {
    score,
    canAcceptSessions,
    missingFields,
    nextSteps: generateNextSteps(missingFields),
    lastCalculated: new Date()
  }
}

/**
 * Check if a specific field is completed
 */
function checkFieldCompletion(fieldName: string, mechanic: any): boolean {
  switch (fieldName) {
    case 'full_name':
      return !!mechanic.full_name && mechanic.full_name.trim().length > 0

    case 'email':
      return !!mechanic.email && mechanic.email.includes('@')

    case 'phone':
      return !!mechanic.phone && mechanic.phone.length >= 10

    case 'profile_photo':
      return !!mechanic.profile_photo_url

    case 'years_experience':
    case 'years_of_experience':  // Support both field names
      const yearsExp = mechanic.years_of_experience || mechanic.years_experience
      return typeof yearsExp === 'number' && yearsExp > 0

    case 'red_seal_certified':
      // For brand specialists, this is required
      // For general mechanics, it's a bonus
      return mechanic.is_brand_specialist ? mechanic.red_seal_certified === true : true

    case 'certifications_uploaded':
      // Check if mechanic has uploaded at least one certification
      return Array.isArray(mechanic.certifications) && mechanic.certifications.length > 0

    case 'specializations':
      // Check if mechanic has selected at least one specialization
      return Array.isArray(mechanic.specializations) && mechanic.specializations.length > 0

    case 'service_keywords':
      // Check if mechanic has selected at least 3 service keywords
      return Array.isArray(mechanic.service_keywords) && mechanic.service_keywords.length >= 3

    case 'availability_set':
      // Check if mechanic has set at least one availability block
      // This might be stored in a separate table or as JSON
      return (
        (Array.isArray(mechanic.availability_blocks) && mechanic.availability_blocks.length > 0) ||
        !!mechanic.availability_schedule
      )

    case 'stripe_connected':
      return !!mechanic.stripe_account_id

    default:
      console.warn(`Unknown field for completion check: ${fieldName}`)
      return false
  }
}

/**
 * Generate actionable next steps based on missing fields
 */
function generateNextSteps(missingFields: MissingField[]): string[] {
  const steps: string[] = []
  const categories = new Set(missingFields.map(f => f.category))

  if (categories.has('basic')) {
    const basicFields = missingFields.filter(f => f.category === 'basic')
    steps.push(`Complete basic information: ${basicFields.map(f => f.field).join(', ')}`)
  }

  if (missingFields.some(f => f.field === 'profile_photo')) {
    steps.push('Upload a professional profile photo (builds customer trust)')
  }

  if (missingFields.some(f => f.field === 'years_experience')) {
    steps.push('Add your years of experience')
  }

  if (missingFields.some(f => f.field === 'certifications_uploaded')) {
    steps.push('Upload your certifications (Red Seal, manufacturer certifications, etc.)')
  }

  if (missingFields.some(f => f.field === 'specializations')) {
    steps.push('Select your specializations (types of vehicles or systems you work on)')
  }

  if (missingFields.some(f => f.field === 'service_keywords')) {
    steps.push('Add service keywords to help match you with customers (e.g., "brake repair", "diagnostics")')
  }

  if (missingFields.some(f => f.field === 'availability_set')) {
    steps.push('Set your availability schedule so customers know when to book')
  }

  if (missingFields.some(f => f.field === 'stripe_connected')) {
    steps.push('Connect your Stripe account to receive payments')
  }

  if (missingFields.some(f => f.field === 'red_seal_certified')) {
    steps.push('Indicate if you are Red Seal certified (increases trust and match score)')
  }

  return steps
}

/**
 * Get profile completion for a mechanic (cached version)
 * Recalculates if more than 1 hour old
 */
export async function getProfileCompletion(
  mechanicId: string,
  forceRecalculate = false
): Promise<ProfileCompletion> {
  const supabase = await createClient()

  if (!forceRecalculate) {
    // Check if we have a recent score
    const { data: mechanic } = await supabase
      .from('mechanics')
      .select('profile_completion_score, can_accept_sessions, updated_at')
      .eq('id', mechanicId)
      .single()

    if (mechanic && mechanic.profile_completion_score !== null) {
      const lastUpdate = new Date(mechanic.updated_at)
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60)

      // If updated within last hour, return cached values
      if (hoursSinceUpdate < 1) {
        // Still need to fetch missing fields for display
        return calculateProfileCompletion(mechanicId)
      }
    }
  }

  // Recalculate
  return calculateProfileCompletion(mechanicId)
}

/**
 * Bulk calculate completion for multiple mechanics
 * Useful for admin dashboards
 */
export async function bulkCalculateCompletion(mechanicIds: string[]): Promise<Map<string, ProfileCompletion>> {
  const results = new Map<string, ProfileCompletion>()

  for (const id of mechanicIds) {
    try {
      const completion = await calculateProfileCompletion(id)
      results.set(id, completion)
    } catch (error) {
      console.error(`Failed to calculate completion for mechanic ${id}:`, error)
    }
  }

  return results
}

/**
 * Get completion statistics across all mechanics
 * Useful for admin analytics
 */
export async function getCompletionStats(): Promise<{
  totalMechanics: number
  canAcceptSessions: number
  averageScore: number
  scoreDistribution: {
    '0-20': number
    '20-40': number
    '40-60': number
    '60-80': number
    '80-100': number
  }
}> {
  const supabase = await createClient()

  const { data: mechanics } = await supabase
    .from('mechanics')
    .select('profile_completion_score, can_accept_sessions')

  if (!mechanics || mechanics.length === 0) {
    return {
      totalMechanics: 0,
      canAcceptSessions: 0,
      averageScore: 0,
      scoreDistribution: {
        '0-20': 0,
        '20-40': 0,
        '40-60': 0,
        '60-80': 0,
        '80-100': 0
      }
    }
  }

  const totalMechanics = mechanics.length
  const canAcceptSessions = mechanics.filter(m => m.can_accept_sessions).length
  const averageScore = mechanics.reduce((sum, m) => sum + (m.profile_completion_score || 0), 0) / totalMechanics

  const scoreDistribution = {
    '0-20': 0,
    '20-40': 0,
    '40-60': 0,
    '60-80': 0,
    '80-100': 0
  }

  mechanics.forEach(m => {
    const score = m.profile_completion_score || 0
    if (score < 20) scoreDistribution['0-20']++
    else if (score < 40) scoreDistribution['20-40']++
    else if (score < 60) scoreDistribution['40-60']++
    else if (score < 80) scoreDistribution['60-80']++
    else scoreDistribution['80-100']++
  })

  return {
    totalMechanics,
    canAcceptSessions,
    averageScore: Math.round(averageScore),
    scoreDistribution
  }
}
