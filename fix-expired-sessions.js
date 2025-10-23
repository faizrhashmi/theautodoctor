const fs = require('fs')

const filePath = 'c:/Users/Faiz Hashmi/theautodoctor/src/app/customer/dashboard/page.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Fix: Add 'unattended' and 'expired' to exclusion list
const oldPattern = `  const upcomingSessions = normalizedSessions
    .filter((session) => !['completed', 'cancelled'].includes(session.status.toLowerCase()))
    .sort((a, b) => sessionSortValue(a) - sessionSortValue(b))`

const newPattern = `  const upcomingSessions = normalizedSessions
    .filter((session) => !['completed', 'cancelled', 'unattended', 'expired'].includes(session.status.toLowerCase()))
    .sort((a, b) => sessionSortValue(a) - sessionSortValue(b))`

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern)
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✅ Fixed customer dashboard to exclude unattended/expired sessions')
  console.log('   Sessions with status "unattended" or "expired" will no longer show in Next Session')
  console.log('')
  console.log('🔄 REFRESH YOUR BROWSER to see the fix!')
} else {
  console.log('❌ Pattern not found - checking if already fixed...')
  if (content.includes("'unattended', 'expired'")) {
    console.log('✅ Already fixed!')
  } else {
    console.log('File may have changed. Manual inspection needed.')
  }
}
