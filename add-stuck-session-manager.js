const fs = require('fs')

const filePath = 'c:/Users/Faiz Hashmi/theautodoctor/src/app/customer/dashboard/page.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Add detection logic before userVehicles
const detectionLogic = `
  // Detect stuck sessions (pending sessions older than 5 minutes that may be blocking new sessions)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).getTime()
  const stuckSessions = scheduledSessions
    .filter(session => {
      const sessionAge = Date.now() - new Date(session.createdAt).getTime()
      const isOld = sessionAge > 5 * 60 * 1000
      const isPending = session.status === 'pending'
      return isPending && isOld
    })
    .map(s => ({ id: s.id, status: s.status, type: s.type, createdAt: s.createdAt }))

  `

content = content.replace(
  '  const userVehicles = vehicles ?? []',
  detectionLogic + 'const userVehicles = vehicles ?? []'
)

// Add component after main tag opens
const componentCode = `
        {/* Stuck Session Manager - Shows pending sessions that may be blocking new sessions */}
        <StuckSessionManager sessions={stuckSessions} />
`

content = content.replace(
  '<main className="mx-auto max-w-7xl px-6 py-8 space-y-8">',
  '<main className="mx-auto max-w-7xl px-6 py-8 space-y-8">' + componentCode
)

fs.writeFileSync(filePath, content, 'utf8')
console.log('✅ Added StuckSessionManager to customer dashboard')
console.log('   - Detection logic added before userVehicles')
console.log('   - Component added after main tag')
console.log('   - Customers can now manually cancel stuck sessions')
