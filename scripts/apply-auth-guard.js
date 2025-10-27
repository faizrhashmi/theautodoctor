/**
 * Script to apply AuthGuard to all customer, mechanic, and workshop pages
 *
 * Usage: node scripts/apply-auth-guard.js
 */

const fs = require('fs');
const path = require('path');

// Pages to update with their role
const PAGES_TO_UPDATE = [
  // Customer pages
  { path: 'src/app/customer/dashboard/page.tsx', role: 'customer', name: 'CustomerDashboard' },
  { path: 'src/app/customer/sessions/page.tsx', role: 'customer', name: 'CustomerSessions' },
  { path: 'src/app/customer/quotes/page.tsx', role: 'customer', name: 'CustomerQuotes' },
  { path: 'src/app/customer/schedule/page.tsx', role: 'customer', name: 'CustomerSchedule' },

  // Mechanic pages
  { path: 'src/app/mechanic/dashboard/page.tsx', role: 'mechanic', name: 'MechanicDashboard' },
  { path: 'src/app/mechanic/dashboard/virtual/page.tsx', role: 'mechanic', name: 'MechanicVirtualDashboard' },
  { path: 'src/app/mechanic/sessions/page.tsx', role: 'mechanic', name: 'MechanicSessions' },
  { path: 'src/app/mechanic/sessions/virtual/page.tsx', role: 'mechanic', name: 'MechanicVirtualSessions' },
  { path: 'src/app/mechanic/profile/page.tsx', role: 'mechanic', name: 'MechanicProfile' },
  { path: 'src/app/mechanic/earnings/page.tsx', role: 'mechanic', name: 'MechanicEarnings' },
  { path: 'src/app/mechanic/crm/page.tsx', role: 'mechanic', name: 'MechanicCRM' },
  { path: 'src/app/mechanic/availability/page.tsx', role: 'mechanic', name: 'MechanicAvailability' },
  { path: 'src/app/mechanic/documents/page.tsx', role: 'mechanic', name: 'MechanicDocuments' },
  { path: 'src/app/mechanic/reviews/page.tsx', role: 'mechanic', name: 'MechanicReviews' },
  { path: 'src/app/mechanic/analytics/page.tsx', role: 'mechanic', name: 'MechanicAnalytics' },
  { path: 'src/app/mechanic/statements/page.tsx', role: 'mechanic', name: 'MechanicStatements' },
  { path: 'src/app/mechanic/partnerships/browse/page.tsx', role: 'mechanic', name: 'MechanicPartnershipsBrowse' },
  { path: 'src/app/mechanic/partnerships/applications/page.tsx', role: 'mechanic', name: 'MechanicPartnershipsApplications' },

  // Workshop pages
  { path: 'src/app/workshop/dashboard/page.tsx', role: 'workshop', name: 'WorkshopDashboard' },
  { path: 'src/app/workshop/analytics/page.tsx', role: 'workshop', name: 'WorkshopAnalytics' },
];

function applyAuthGuard(filePath, role, componentName) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skip: ${filePath} (file not found)`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has AuthGuard
  if (content.includes('AuthGuard')) {
    console.log(`✓  Skip: ${filePath} (already has AuthGuard)`);
    return false;
  }

  // Check if it's a client component
  if (!content.includes("'use client'")) {
    console.log(`⚠️  Skip: ${filePath} (not a client component)`);
    return false;
  }

  // Add imports if not present
  if (!content.includes('import { AuthGuard }')) {
    const importStatement = `import { AuthGuard } from '@/components/AuthGuard'\nimport { useAuthGuard } from '@/hooks/useAuthGuard'\n`;
    content = content.replace("'use client'\n", `'use client'\n\n${importStatement}`);
  }

  // Find the default export
  const defaultExportRegex = /export default function (\w+)/;
  const match = content.match(defaultExportRegex);

  if (!match) {
    console.log(`⚠️  Skip: ${filePath} (no default export found)`);
    return false;
  }

  const originalFunctionName = match[1];
  const contentFunctionName = `${originalFunctionName}Content`;

  // Rename the main function
  content = content.replace(
    `export default function ${originalFunctionName}`,
    `function ${contentFunctionName}`
  );

  // Add useAuthGuard hook at the start of the function
  const functionStartRegex = new RegExp(`function ${contentFunctionName}\\([^)]*\\) \\{`);
  content = content.replace(
    functionStartRegex,
    (match) => `${match}\n  const { user } = useAuthGuard({ requiredRole: '${role}' })\n`
  );

  // Add the new default export with AuthGuard wrapper at the end
  const wrapperFunction = `\n// Protected with AuthGuard for authentication
export default function ${originalFunctionName}() {
  return (
    <AuthGuard requiredRole="${role}" redirectTo="/signup?redirect=/${role}/dashboard">
      <${contentFunctionName} />
    </AuthGuard>
  )
}\n`;

  content += wrapperFunction;

  // Write the updated content
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Updated: ${filePath}`);
  return true;
}

// Apply to all pages
console.log('🚀 Starting AuthGuard application...\n');

let updated = 0;
let skipped = 0;

PAGES_TO_UPDATE.forEach(({ path: filePath, role, name }) => {
  const result = applyAuthGuard(filePath, role, name);
  if (result) {
    updated++;
  } else {
    skipped++;
  }
});

console.log(`\n✅ Complete!`);
console.log(`   Updated: ${updated} pages`);
console.log(`   Skipped: ${skipped} pages`);
console.log(`\n📝 Please review the changes and test each page.`);
