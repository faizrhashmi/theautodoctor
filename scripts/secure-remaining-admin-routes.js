#!/usr/bin/env node

/**
 * Script to add requireAdmin security to remaining admin API routes
 *
 * This script:
 * 1. Finds all admin API route files
 * 2. Checks if they already have requireAdmin import
 * 3. Lists files that need to be updated manually
 *
 * Usage: node scripts/secure-remaining-admin-routes.js
 */

const fs = require('fs')
const path = require('path')

const ADMIN_API_DIR = path.join(__dirname, '../src/app/api/admin')

// Files that have already been secured
const SECURED_FILES = [
  'clear-all-sessions/route.ts',
  'clear-session-requests/route.ts',
  'users/customers/route.ts',
  'users/[id]/ban/route.ts',
  'users/[id]/suspend/route.ts',
  'sessions/bulk-cancel/route.ts',
  'dashboard/stats/route.ts',
]

function getAllRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      getAllRouteFiles(filePath, fileList)
    } else if (file === 'route.ts') {
      const relativePath = path.relative(ADMIN_API_DIR, filePath)
      fileList.push({
        absolute: filePath,
        relative: relativePath,
      })
    }
  })

  return fileList
}

function hasRequireAdmin(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  return content.includes('requireAdmin')
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')

  const hasAuth = content.includes('requireAdmin')
  const hasTsNoCheck = content.includes('@ts-nocheck')
  const httpMethods = []

  if (content.includes('export async function GET')) httpMethods.push('GET')
  if (content.includes('export async function POST')) httpMethods.push('POST')
  if (content.includes('export async function PUT')) httpMethods.push('PUT')
  if (content.includes('export async function DELETE')) httpMethods.push('DELETE')
  if (content.includes('export async function PATCH')) httpMethods.push('PATCH')

  return { hasAuth, hasTsNoCheck, httpMethods }
}

console.log('\n🔒 Admin API Route Security Analyzer\n')
console.log('=' .repeat(60))

const allRoutes = getAllRouteFiles(ADMIN_API_DIR)

console.log(`\nTotal admin API routes found: ${allRoutes.length}`)

const secured = []
const needsSecuring = []

allRoutes.forEach(route => {
  const analysis = analyzeFile(route.absolute)

  if (analysis.hasAuth) {
    secured.push({ ...route, ...analysis })
  } else {
    needsSecuring.push({ ...route, ...analysis })
  }
})

console.log(`✅ Already secured: ${secured.length}`)
console.log(`❌ Needs securing: ${needsSecuring.length}`)

if (needsSecuring.length > 0) {
  console.log('\n' + '=' .repeat(60))
  console.log('\n⚠️  ROUTES THAT NEED SECURITY FIXES:\n')

  needsSecuring.forEach((route, index) => {
    console.log(`${index + 1}. ${route.relative}`)
    console.log(`   Methods: ${route.httpMethods.join(', ')}`)
    console.log(`   Has @ts-nocheck: ${route.hasTsNoCheck ? 'YES ❌' : 'NO ✅'}`)
    console.log(`   File: ${route.absolute}`)
    console.log('')
  })

  console.log('=' .repeat(60))
  console.log('\n📋 TO FIX EACH FILE:\n')
  console.log('1. Add import at top:')
  console.log('   import { requireAdmin } from \'@/lib/auth/requireAdmin\'')
  console.log('')
  console.log('2. At the start of each handler function, add:')
  console.log('   const auth = await requireAdmin(req)')
  console.log('   if (!auth.authorized) return auth.response!')
  console.log('')
  console.log('3. Optionally log admin actions:')
  console.log('   console.log(`[ADMIN] ${auth.profile?.full_name} performed action`)')
  console.log('')
  console.log('4. If file has @ts-nocheck, consider removing it after fixing types')
  console.log('')
}

// Generate a report file
const report = {
  timestamp: new Date().toISOString(),
  total: allRoutes.length,
  secured: secured.length,
  needsSecuring: needsSecuring.length,
  files: needsSecuring.map(r => ({
    path: r.relative,
    methods: r.httpMethods,
    hasTsNoCheck: r.hasTsNoCheck,
  })),
}

const reportPath = path.join(__dirname, '../ADMIN_SECURITY_REPORT.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

console.log(`\n📄 Detailed report saved to: ADMIN_SECURITY_REPORT.json\n`)
console.log('=' .repeat(60))
console.log('\n✅ Analysis complete!\n')
