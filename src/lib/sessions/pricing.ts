/**
 * Session Pricing Configuration
 *
 * Base prices for different session types
 */

export const SESSION_PRICES = {
  CHAT: 15.00,
  VIDEO: 35.00,
  VIDEO_UPGRADE_FEE: 20.00  // Additional cost to upgrade from chat to video
} as const

export type SessionType = 'chat' | 'video' | 'upgraded_from_chat' | 'mobile_visit'

/**
 * Calculate pricing for a session
 */
export function calculateSessionPrice(sessionType: SessionType): {
  base_price: number
  total_price: number
  upgrade_price?: number
} {
  switch (sessionType) {
    case 'chat':
      return {
        base_price: SESSION_PRICES.CHAT,
        total_price: SESSION_PRICES.CHAT
      }

    case 'video':
      return {
        base_price: SESSION_PRICES.VIDEO,
        total_price: SESSION_PRICES.VIDEO
      }

    case 'upgraded_from_chat':
      return {
        base_price: SESSION_PRICES.CHAT,
        upgrade_price: SESSION_PRICES.VIDEO_UPGRADE_FEE,
        total_price: SESSION_PRICES.CHAT + SESSION_PRICES.VIDEO_UPGRADE_FEE
      }

    case 'mobile_visit':
      // Mobile visits typically charged separately
      return {
        base_price: 0,
        total_price: 0
      }

    default:
      throw new Error(`Unknown session type: ${sessionType}`)
  }
}

/**
 * Calculate upgrade pricing
 */
export function calculateUpgradePrice(currentType: SessionType): {
  can_upgrade: boolean
  upgrade_fee?: number
  total_after_upgrade?: number
} {
  if (currentType !== 'chat') {
    return {
      can_upgrade: false
    }
  }

  return {
    can_upgrade: true,
    upgrade_fee: SESSION_PRICES.VIDEO_UPGRADE_FEE,
    total_after_upgrade: SESSION_PRICES.VIDEO
  }
}

/**
 * Validate if session can be upgraded
 */
export function canUpgradeSession(
  sessionType: SessionType,
  sessionStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
): {
  can_upgrade: boolean
  reason?: string
} {
  // Can only upgrade chat sessions
  if (sessionType !== 'chat') {
    return {
      can_upgrade: false,
      reason: 'Only chat sessions can be upgraded'
    }
  }

  // Cannot upgrade completed or cancelled sessions
  if (sessionStatus === 'completed') {
    return {
      can_upgrade: false,
      reason: 'Cannot upgrade completed session'
    }
  }

  if (sessionStatus === 'cancelled') {
    return {
      can_upgrade: false,
      reason: 'Cannot upgrade cancelled session'
    }
  }

  return {
    can_upgrade: true
  }
}

/**
 * Format pricing for display
 */
export function formatSessionPrice(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Get session type display name
 */
export function getSessionTypeDisplayName(sessionType: SessionType): string {
  switch (sessionType) {
    case 'chat':
      return 'Chat Session'
    case 'video':
      return 'Video Session'
    case 'upgraded_from_chat':
      return 'Video Session (Upgraded from Chat)'
    case 'mobile_visit':
      return 'Mobile Visit'
    default:
      return 'Unknown Session Type'
  }
}
