/**
 * Tab Attention Helper
 *
 * Tier 4: Update browser tab title to show new request count
 */

let originalTitle = ''

/**
 * Update tab title with new request count
 * Shows "(N) Original Title" when count > 0
 */
export function setTabNewRequests(count: number) {
  if (typeof window === 'undefined') return

  // Store original title on first call
  if (!originalTitle && count === 0) {
    originalTitle = document.title
  }

  if (count > 0) {
    document.title = `(${count}) ${originalTitle || document.title}`
  } else {
    document.title = originalTitle || document.title
  }
}

/**
 * Reset tab title to original
 */
export function resetTabTitle() {
  if (typeof window === 'undefined') return
  if (originalTitle) {
    document.title = originalTitle
  }
}
