#!/usr/bin/env node
/**
 * Script to add withDebugAuth to debug endpoints
 *
 * Usage: node scripts/add-debug-auth.js
 */

const fs = require('fs');
const path = require('path');

const debugDir = path.join(__dirname, '../src/app/api/debug');

// List of files that need withDebugAuth added
const filesToFix = [
  'apply-auth-fix/route.ts',
  'apply-migration/route.ts',
  'auth-audit/route.ts',
  'change-service-tier/route.ts',
  'check-end-session/route.ts',
  'check-foreign-keys/route.ts',
  'check-mechanic/route.ts',
  'check-session/route.ts',
  'check-session-request/route.ts',
  'check-session-requests/route.ts',
  'check-sessions-for-requests/route.ts',
  'cleanup-all-old-requests/route.ts',
  'cleanup-customer-sessions/route.ts',
  'cleanup-stuck-requests/route.ts',
  'clear-all-accepted/route.ts',
  'clear-all-pending/route.ts',
  'create-session-request/route.ts',
  'diagnose-flow/route.ts',
  'end-session-now/route.ts',
  'fix-current-session/route.ts',
  'fix-mechanic-auth/route.ts',
  'fix-session-participants/route.ts',
  'force-end-session/route.ts',
  'grant-workshop-access/route.ts',
  'mechanic-requests/route.ts',
  'production-check/route.ts',
  'reset-mechanic-password/route.ts',
  'test-auth-leak/route.ts',
  'test-end-session/route.ts',
  'test-mechanic-flow/route.ts',
  'test-mechanic-rls/route.ts',
  'test-session-requests-query/route.ts',
  'test-session-request-update/route.ts',
];

function addWithDebugAuth(filePath) {
  const fullPath = path.join(debugDir, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Check if already has withDebugAuth
  if (content.includes('withDebugAuth')) {
    console.log(`⏭️  Skipping ${filePath} (already has withDebugAuth)`);
    return true;
  }

  // Add import if not present
  if (!content.includes("import { withDebugAuth }")) {
    const importLine = "import { withDebugAuth } from '@/lib/debugAuth'\n";

    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    lines.splice(lastImportIndex + 1, 0, importLine);
    content = lines.join('\n');
  }

  // Find and wrap GET/POST/PUT/DELETE exports
  const methodRegex = /^export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/gm;

  let match;
  const methods = [];
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }

  if (methods.length === 0) {
    console.log(`⚠️  No HTTP methods found in ${filePath}`);
    return false;
  }

  // For each method, convert to handler pattern
  for (const method of methods) {
    const handlerName = method.toLowerCase() + 'Handler';

    // Replace: export async function METHOD(
    // With:    async function METHODHandler(
    const exportPattern = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\(`,
      'g'
    );
    content = content.replace(exportPattern, `async function ${handlerName}(`);
  }

  // Add wrapper exports at the end (before any existing exports if they're at the bottom)
  const wrapperExports = methods
    .map(method => {
      const handlerName = method.toLowerCase() + 'Handler';
      return `export const ${method} = withDebugAuth(${handlerName})`;
    })
    .join('\n');

  // Add comment and exports at the end
  content = content.trimEnd() + '\n\n// P0-1 FIX: Protect debug endpoint with authentication\n' + wrapperExports + '\n';

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Updated ${filePath}`);
  return true;
}

// Process all files
let successCount = 0;
let failCount = 0;

console.log(`\n🔒 Adding withDebugAuth to ${filesToFix.length} debug endpoints...\n`);

for (const file of filesToFix) {
  if (addWithDebugAuth(file)) {
    successCount++;
  } else {
    failCount++;
  }
}

console.log(`\n✅ Success: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📊 Total: ${filesToFix.length}\n`);
