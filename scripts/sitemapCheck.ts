/**
 * Sitemap Validation Script for AskAutoDoctor
 *
 * Purpose: Verify all pages in the codebase are documented and functional
 * Usage: tsx scripts/sitemapCheck.ts
 *
 * This script:
 * - Scans src/app/**/page.tsx files
 * - Checks if they exist in the sitemap documentation
 * - Identifies orphaned pages (exist in code but not documented)
 * - Identifies missing pages (documented but don't exist)
 * - Validates route structure and naming conventions
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

const SITEMAP_PATH = path.join(process.cwd(), 'audit', 'sitemap_generated.md')
const APP_DIR = path.join(process.cwd(), 'src', 'app')

interface PageInfo {
  filePath: string
  route: string
  exists: boolean
  documented: boolean
  type: 'page' | 'layout' | 'route' | 'api'
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert file path to route path
 * Example: src/app/customer/dashboard/page.tsx → /customer/dashboard
 */
function filePathToRoute(filePath: string): string {
  // Remove src/app prefix
  let route = filePath.replace(/^src[\\/]app/, '')

  // Remove /page.tsx or /route.ts suffix
  route = route.replace(/[\\/]page\.tsx$/, '')
  route = route.replace(/[\\/]route\.ts$/, '')

  // Remove (shell) directory notation
  route = route.replace(/[\\/]\(shell\)/g, '')

  // Replace dynamic segments [param] with :param
  route = route.replace(/\[([^\]]+)\]/g, ':$1')

  // Normalize path separators
  route = route.replace(/\\/g, '/')

  // Ensure leading slash
  if (!route.startsWith('/')) {
    route = '/' + route
  }

  // Handle root route
  if (route === '/') {
    return '/'
  }

  return route
}

/**
 * Scan directory for all page.tsx files
 */
async function findAllPages(): Promise<PageInfo[]> {
  const pages: PageInfo[] = []

  // Find all page.tsx files
  const pageFiles = await glob('src/app/**/page.tsx', {
    ignore: ['**/node_modules/**', '**/.next/**'],
    windowsPathsNoEscape: true,
  })

  for (const filePath of pageFiles) {
    const route = filePathToRoute(filePath)
    pages.push({
      filePath,
      route,
      exists: true,
      documented: false,
      type: 'page',
    })
  }

  return pages
}

/**
 * Read sitemap and extract documented routes
 */
function extractDocumentedRoutes(): string[] {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`⚠️  Sitemap not found at: ${SITEMAP_PATH}`)
    return []
  }

  const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8')

  // Extract routes from markdown
  // Format: - `/route/path` - Description
  const routePattern = /^-\s+`?(\/[^`\s-]+)`?\s+-/gm
  const matches = sitemapContent.matchAll(routePattern)

  const routes: string[] = []
  for (const match of matches) {
    routes.push(match[1])
  }

  return routes
}

/**
 * Check if a route is documented in the sitemap
 */
function isRouteDocumented(route: string, documentedRoutes: string[]): boolean {
  // Direct match
  if (documentedRoutes.includes(route)) {
    return true
  }

  // Check if dynamic route is documented
  // Example: /customer/quotes/:quoteId might be documented as /customer/quotes/[quoteId]
  const dynamicRoute = route.replace(/:([^/]+)/g, '[$1]')
  if (documentedRoutes.includes(dynamicRoute)) {
    return true
  }

  return false
}

/**
 * Categorize routes by section
 */
function categorizeRoutes(pages: PageInfo[]): Record<string, PageInfo[]> {
  const categories: Record<string, PageInfo[]> = {
    public: [],
    customer: [],
    mechanic: [],
    workshop: [],
    admin: [],
    corporate: [],
    session: [],
    api: [],
    other: [],
  }

  for (const page of pages) {
    if (page.route.startsWith('/customer')) {
      categories.customer.push(page)
    } else if (page.route.startsWith('/mechanic')) {
      categories.mechanic.push(page)
    } else if (page.route.startsWith('/workshop')) {
      categories.workshop.push(page)
    } else if (page.route.startsWith('/admin')) {
      categories.admin.push(page)
    } else if (page.route.startsWith('/corporate')) {
      categories.corporate.push(page)
    } else if (page.route.startsWith('/session') || page.route.startsWith('/chat') || page.route.startsWith('/video')) {
      categories.session.push(page)
    } else if (page.route.startsWith('/api')) {
      categories.api.push(page)
    } else if (page.route.match(/^\/(about|pricing|contact|login|signup|waiver|thank-you|unsubscribe)/)) {
      categories.public.push(page)
    } else {
      categories.other.push(page)
    }
  }

  return categories
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runSitemapCheck() {
  console.log('🗺️  AskAutoDoctor Sitemap Validation')
  console.log('=' .repeat(80))
  console.log(`App Directory: ${APP_DIR}`)
  console.log(`Sitemap Path: ${SITEMAP_PATH}`)
  console.log(`Started: ${new Date().toISOString()}`)
  console.log('=' .repeat(80))
  console.log()

  // Find all pages
  console.log('📂 Scanning for pages...')
  const pages = await findAllPages()
  console.log(`   Found ${pages.length} pages`)
  console.log()

  // Load documented routes
  console.log('📄 Loading sitemap...')
  const documentedRoutes = extractDocumentedRoutes()
  console.log(`   Found ${documentedRoutes.length} documented routes`)
  console.log()

  // Mark pages as documented
  for (const page of pages) {
    page.documented = isRouteDocumented(page.route, documentedRoutes)
  }

  // Categorize routes
  const categories = categorizeRoutes(pages)

  // Calculate statistics
  const totalPages = pages.length
  const documentedPages = pages.filter(p => p.documented).length
  const undocumentedPages = pages.filter(p => !p.documented).length
  const documentationRate = ((documentedPages / totalPages) * 100).toFixed(1)

  console.log('=' .repeat(80))
  console.log('📊 STATISTICS')
  console.log('=' .repeat(80))
  console.log(`Total Pages: ${totalPages}`)
  console.log(`Documented: ${documentedPages} (${documentationRate}%)`)
  console.log(`Undocumented: ${undocumentedPages}`)
  console.log()

  // Report by category
  console.log('📁 BY CATEGORY')
  console.log('=' .repeat(80))
  for (const [category, categoryPages] of Object.entries(categories)) {
    if (categoryPages.length === 0) continue

    const documented = categoryPages.filter(p => p.documented).length
    const rate = ((documented / categoryPages.length) * 100).toFixed(0)
    console.log(`${category.toUpperCase()}: ${documented}/${categoryPages.length} (${rate}%)`)
  }
  console.log()

  // List undocumented pages
  if (undocumentedPages > 0) {
    console.log('⚠️  UNDOCUMENTED PAGES')
    console.log('=' .repeat(80))
    console.log('The following pages exist in code but are not documented in the sitemap:')
    console.log()

    for (const [category, categoryPages] of Object.entries(categories)) {
      const undoc = categoryPages.filter(p => !p.documented)
      if (undoc.length === 0) continue

      console.log(`${category.toUpperCase()}:`)
      for (const page of undoc) {
        console.log(`   ❌ ${page.route}`)
        console.log(`      File: ${page.filePath}`)
      }
      console.log()
    }
  }

  // Check for routes in sitemap that don't exist in code
  console.log('🔍 CHECKING FOR MISSING PAGES')
  console.log('=' .repeat(80))
  const existingRoutes = pages.map(p => p.route)
  const missingPages: string[] = []

  for (const docRoute of documentedRoutes) {
    // Skip API routes and dynamic routes for this check
    if (docRoute.startsWith('/api') || docRoute.includes('[')) {
      continue
    }

    const routeExists = existingRoutes.some(r => {
      // Normalize for comparison
      const normalizedDoc = docRoute.replace(/\[([^\]]+)\]/g, ':$1')
      return r === normalizedDoc || r === docRoute
    })

    if (!routeExists) {
      missingPages.push(docRoute)
    }
  }

  if (missingPages.length > 0) {
    console.log('The following routes are documented but do not exist in code:')
    console.log()
    for (const route of missingPages) {
      console.log(`   ⚠️  ${route}`)
    }
  } else {
    console.log('✅ All documented routes exist in code')
  }
  console.log()

  // Route naming convention check
  console.log('🔤 NAMING CONVENTION CHECK')
  console.log('=' .repeat(80))
  const invalidNames: string[] = []

  for (const page of pages) {
    // Check for invalid characters in route names
    if (page.route.match(/[A-Z]/)) {
      invalidNames.push(`${page.route} - Contains uppercase letters`)
    }

    // Check for spaces
    if (page.route.includes(' ')) {
      invalidNames.push(`${page.route} - Contains spaces`)
    }

    // Check for underscores (should use hyphens)
    if (page.route.includes('_') && !page.route.includes('/_next')) {
      invalidNames.push(`${page.route} - Contains underscores (use hyphens instead)`)
    }
  }

  if (invalidNames.length > 0) {
    console.log('⚠️  Routes with naming convention issues:')
    console.log()
    for (const issue of invalidNames) {
      console.log(`   ${issue}`)
    }
  } else {
    console.log('✅ All routes follow naming conventions')
  }
  console.log()

  // Save results
  const outputPath = path.join(process.cwd(), 'sitemap-check-results.json')
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      totalPages,
      documentedPages,
      undocumentedPages,
      documentationRate: documentationRate + '%',
      missingPages: missingPages.length,
      namingIssues: invalidNames.length,
    },
    categories: Object.fromEntries(
      Object.entries(categories).map(([cat, categoryPages]) => [
        cat,
        {
          total: categoryPages.length,
          documented: categoryPages.filter(p => p.documented).length,
        },
      ])
    ),
    undocumentedPages: pages.filter(p => !p.documented).map(p => ({
      route: p.route,
      filePath: p.filePath,
    })),
    missingPages,
    namingIssues: invalidNames,
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`📁 Results saved to: ${outputPath}`)
  console.log()

  // Final verdict
  console.log('=' .repeat(80))
  if (undocumentedPages === 0 && missingPages.length === 0 && invalidNames.length === 0) {
    console.log('✅ SITEMAP VALIDATION PASSED')
    console.log('All pages are documented and sitemap is accurate.')
    process.exit(0)
  } else {
    console.log('⚠️  SITEMAP VALIDATION WARNINGS')
    if (undocumentedPages > 0) {
      console.log(`   - ${undocumentedPages} pages need to be added to sitemap`)
    }
    if (missingPages.length > 0) {
      console.log(`   - ${missingPages.length} documented routes don't exist in code`)
    }
    if (invalidNames.length > 0) {
      console.log(`   - ${invalidNames.length} routes have naming convention issues`)
    }
    console.log()
    console.log('Please review the issues above and update the sitemap accordingly.')
    process.exit(1)
  }
}

// Run check
runSitemapCheck().catch(error => {
  console.error('Fatal error running sitemap check:', error)
  process.exit(1)
})
