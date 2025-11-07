// Banner Diagnostic Script
// Run this in browser console on /customer/dashboard

console.log('=== BANNER DIAGNOSTIC START ===\n')

// 1. Check if we're on the right page
console.log('1. CURRENT PAGE CHECK')
console.log('   URL:', window.location.href)
console.log('   Pathname:', window.location.pathname)
console.log('')

// 2. Test API endpoint
console.log('2. API ENDPOINT TEST')
try {
  const res = await fetch('/api/customer/sessions/active', { cache: 'no-store' })
  console.log('   Status:', res.status, res.statusText)
  const data = await res.json()
  console.log('   Response:', JSON.stringify(data, null, 2))

  if (data.active && data.session) {
    console.log('   ✅ Active session found:', data.session.id)
    console.log('   Session status:', data.session.status)
    console.log('   Session type:', data.session.type)
  } else {
    console.log('   ⚠️ No active session found')
    console.log('   active:', data.active)
    console.log('   session:', data.session)
  }
} catch (error) {
  console.error('   ❌ API call failed:', error)
}
console.log('')

// 3. Check for React components in DOM
console.log('3. DOM COMPONENT CHECK')
const hasCustomerLayout = document.querySelector('main') !== null
console.log('   Has <main> element:', hasCustomerLayout)

const hasBannerContainer = document.querySelector('[class*="sticky"][class*="top-0"]') !== null
console.log('   Has sticky banner container:', hasBannerContainer)

if (hasBannerContainer) {
  const bannerEl = document.querySelector('[class*="sticky"][class*="top-0"]')
  console.log('   Banner element found:', bannerEl)
  console.log('   Banner display:', window.getComputedStyle(bannerEl).display)
  console.log('   Banner visibility:', window.getComputedStyle(bannerEl).visibility)
}
console.log('')

// 4. Check console logs
console.log('4. CONSOLE LOG FILTER')
console.log('   Look for logs starting with:')
console.log('   - [ActiveSessionBanner]')
console.log('   - [CustomerLayout]')
console.log('   - [customer/active]')
console.log('')

// 5. Check for React DevTools
console.log('5. REACT DEVTOOLS CHECK')
console.log('   If you have React DevTools installed:')
console.log('   - Look for <ActiveSessionBanner> component')
console.log('   - Check its props and state')
console.log('')

console.log('=== BANNER DIAGNOSTIC END ===')
console.log('\nℹ️ If API returns active session but banner not visible:')
console.log('   - Check if banner HTML exists but is hidden (display:none)')
console.log('   - Check console for [ActiveSessionBanner] logs')
console.log('   - Verify session status is not "completed" or "cancelled"')
