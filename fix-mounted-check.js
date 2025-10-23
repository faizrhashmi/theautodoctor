const fs = require('fs')

const filePath = 'c:/Users/Faiz Hashmi/theautodoctor/src/app/mechanic/dashboard/MechanicDashboardClient.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Remove the problematic isMountedRef check that's aborting
const oldPattern = `        console.log('[loadSessions] Query result:', { dataCount: data?.length, error })

        if (!isMountedRef.current) {
          console.log('[loadSessions] Component unmounted, aborting')
          return
        }

        if (error) {`

const newPattern = `        console.log('[loadSessions] Query result:', { dataCount: data?.length, error })

        // FIX: Removed isMountedRef check - React 18 StrictMode causes false unmount detection
        // If we have data from the query, we should update state regardless

        if (error) {`

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern)
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✅ Fixed mounted ref check in loadSessions')
  console.log('   The component will now update state even after StrictMode remounts')
  console.log('')
  console.log('🔄 REFRESH YOUR BROWSER to see session history!')
} else {
  console.log('❌ Pattern not found - checking if already fixed...')
  if (content.includes('// FIX: Removed isMountedRef check')) {
    console.log('✅ Already fixed!')
  }
}
