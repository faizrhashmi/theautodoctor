const fs = require('fs')

const filePath = 'c:/Users/Faiz Hashmi/theautodoctor/src/app/mechanic/dashboard/MechanicDashboardClient.tsx'
let content = fs.readFileSync(filePath, 'utf8')

// Find and replace the problematic section
const oldPattern = `                    ))}
                    {sessionHistory.length === 0 && !isLoadingSessions && (
                      <div className="rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                        No session history yet.
                      </div>
                    )}
                  </div>`

const newPattern = `                    ))}
                  </div>

                  {/* Empty State - Moved outside to prevent hydration errors */}
                  {sessionHistory.length === 0 && !isLoadingSessions && (
                    <div className="mt-6 rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                      No session history yet.
                    </div>
                  )}`

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern)
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✅ Fixed hydration error in MechanicDashboardClient.tsx')
  console.log('   Moved empty state outside of session list container')
} else {
  console.log('❌ Pattern not found - file may have changed')
  console.log('Looking for:')
  console.log(oldPattern.substring(0, 100) + '...')
}
