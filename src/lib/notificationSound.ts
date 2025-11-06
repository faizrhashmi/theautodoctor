/**
 * Notification Sound Handler
 *
 * Tier 2: Audio alert for new session requests
 * Requires user interaction before first play (browser security)
 */

let audio: HTMLAudioElement | null = null
let enabled = false

/**
 * Prime audio for playback
 * Call once on any user interaction (tap/click) due to browser policies
 */
export function primeAudio() {
  if (typeof window === 'undefined') return

  if (!audio) {
    audio = new Audio('/sounds/new-request.mp3')
    audio.preload = 'auto'
  }
  enabled = true
  console.log('[Audio] Notification sound ready')
}

/**
 * Play notification sound
 * Only works after primeAudio() has been called
 */
export function playNotificationSound() {
  if (!enabled || !audio) {
    console.warn('[Audio] Cannot play - audio not primed yet')
    return
  }

  try {
    audio.currentTime = 0
    audio.volume = 0.5
    audio.play().catch((err) => {
      console.error('[Audio] Playback blocked:', err.message)
    })
  } catch (error) {
    console.error('[Audio] Error:', error)
  }
}

/**
 * Check if audio is primed and ready
 */
export function isAudioReady() {
  return enabled && !!audio
}
