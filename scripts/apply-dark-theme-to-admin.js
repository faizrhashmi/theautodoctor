// Apply dark theme to all admin pages
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const adminPages = [
  'src/app/admin/(shell)/cleanup/page.tsx',
  'src/app/admin/(shell)/corporate/page.tsx',
  'src/app/admin/(shell)/database/page.tsx',
  'src/app/admin/(shell)/errors/page.tsx',
  'src/app/admin/(shell)/health/page.tsx',
  'src/app/admin/(shell)/intakes/[id]/details/page.tsx',
  'src/app/admin/(shell)/intakes/deletions/page.tsx',
  'src/app/admin/(shell)/logs/page.tsx',
  'src/app/admin/(shell)/mechanics/[id]/page.tsx',
  'src/app/admin/(shell)/mechanics/applications/page.tsx',
  'src/app/admin/(shell)/mechanics/page.tsx',
  'src/app/admin/(shell)/sessions/page.tsx',
  'src/app/admin/(shell)/unattended/page.tsx',
  'src/app/admin/(shell)/workshops/applications/page.tsx',
  'src/app/admin/(shell)/profile-completion/page.tsx',
  'src/app/admin/(shell)/brands/page.tsx',
  'src/app/admin/(shell)/claims/page.tsx',
  'src/app/admin/(shell)/requests/page.tsx',
  'src/app/admin/(shell)/analytics/overview/page.tsx',
  'src/app/admin/(shell)/intakes/page.tsx',
  'src/app/admin/(shell)/documents/page.tsx',
  'src/app/admin/fees/page.tsx',
  'src/app/admin/dashboard/page.tsx',
  'src/app/admin/emergency/page.tsx',
  'src/app/admin/(shell)/customers/[id]/page.tsx',
  'src/app/admin/(shell)/plans/page.tsx',
  'src/app/admin/analytics/workshop/page.tsx',
]

const rootDir = path.join(__dirname, '..')

// Color replacements for dark theme
const replacements = [
  // Background colors
  { from: /className="([^"]*?)bg-white(\s|")/g, to: 'className="$1bg-slate-800/50 backdrop-blur-sm$2' },
  { from: /className="([^"]*?)bg-slate-50(\s|")/g, to: 'className="$1bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950$2' },
  { from: /className="([^"]*?)bg-gray-50(\s|")/g, to: 'className="$1bg-slate-900/50$2' },
  { from: /className="([^"]*?)bg-gray-100(\s|")/g, to: 'className="$1bg-slate-800/50$2' },

  // Text colors for headings and important text
  { from: /className="([^"]*?)text-slate-900(\s|")/g, to: 'className="$1text-white$2' },
  { from: /className="([^"]*?)text-gray-900(\s|")/g, to: 'className="$1text-white$2' },
  { from: /className="([^"]*?)text-slate-800(\s|")/g, to: 'className="$1text-slate-100$2' },
  { from: /className="([^"]*?)text-gray-800(\s|")/g, to: 'className="$1text-slate-100$2' },
  { from: /className="([^"]*?)text-slate-700(\s|")/g, to: 'className="$1text-slate-200$2' },
  { from: /className="([^"]*?)text-gray-700(\s|")/g, to: 'className="$1text-slate-200$2' },
  { from: /className="([^"]*?)text-slate-600(\s|")/g, to: 'className="$1text-slate-400$2' },
  { from: /className="([^"]*?)text-gray-600(\s|")/g, to: 'className="$1text-slate-400$2' },
  { from: /className="([^"]*?)text-slate-500(\s|")/g, to: 'className="$1text-slate-500$2' },
  { from: /className="([^"]*?)text-gray-500(\s|")/g, to: 'className="$1text-slate-500$2' },

  // Border colors
  { from: /className="([^"]*?)border-slate-200(\s|")/g, to: 'className="$1border-slate-700$2' },
  { from: /className="([^"]*?)border-gray-200(\s|")/g, to: 'className="$1border-slate-700$2' },
  { from: /className="([^"]*?)border-slate-300(\s|")/g, to: 'className="$1border-slate-700$2' },
  { from: /className="([^"]*?)border-gray-300(\s|")/g, to: 'className="$1border-slate-700$2' },

  // Buttons - convert blue to orange gradient
  { from: /className="([^"]*?)bg-blue-600(\s|")/g, to: 'className="$1bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25$2' },
  { from: /className="([^"]*?)hover:bg-blue-700(\s|")/g, to: 'className="$1hover:from-orange-600 hover:to-red-700$2' },

  // Input fields
  { from: /className="([^"]*?)bg-white(\s+[^"]*?(?:input|select|textarea))/g, to: 'className="$1bg-slate-800/50$2' },
]

let totalFiles = 0
let updatedFiles = 0

adminPages.forEach((relativePath) => {
  const filePath = path.join(rootDir, relativePath)

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${relativePath}`)
    return
  }

  totalFiles++
  let content = fs.readFileSync(filePath, 'utf8')
  let originalContent = content
  let changesCount = 0

  // Apply all replacements
  replacements.forEach((replacement) => {
    const matches = content.match(replacement.from)
    if (matches) {
      changesCount += matches.length
      content = content.replace(replacement.from, replacement.to)
    }
  })

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8')
    updatedFiles++
    console.log(`✅ Updated: ${relativePath} (${changesCount} changes)`)
  } else {
    console.log(`ℹ️  No changes needed: ${relativePath}`)
  }
})

console.log(`\n📊 Summary:`)
console.log(`   Total files checked: ${totalFiles}`)
console.log(`   Files updated: ${updatedFiles}`)
console.log(`   Files unchanged: ${totalFiles - updatedFiles}`)
