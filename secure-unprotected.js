const fs = require('fs');
const path = require('path');

const ADMIN_DIR = 'c:\\Users\\Faiz Hashmi\\theautodoctor\\src\\app\\api\\admin';

// Unprotected routes (excluding login, logout, test-login, debug-auth)
const unprotectedRoutes = [
  'analytics/beta-program/route.ts',
  'analytics/workshop-health/[id]/route.ts',
  'analytics/workshop-overview/route.ts',
  'cleanup/history/route.ts',
  'cleanup/preview/route.ts',
  'cleanup-all-users/route.ts',
  'corporate/route.ts',
  'corporate/[id]/generate-invoice/route.ts',
  'corporate/[id]/reject/route.ts',
  'corporate/[id]/suspend/route.ts',
  'create-test-users/route.ts',
  'database/history/route.ts',
  'database/saved-queries/route.ts',
  'delete-user/route.ts',
  'errors/route.ts',
  'errors/[id]/route.ts',
  'fix-mechanics/route.ts',
  'health/route.ts',
  'intakes/export/route.ts',
  'intakes/[id]/route.ts',
  'intakes/[id]/status/route.ts',
  'logs/stats/route.ts',
  'mechanic-documents/route.ts',
  'mechanic-documents/[id]/review/route.ts',
  'mechanics/applications/route.ts',
  'mechanics/[id]/request_info/route.ts',
  'plans/[id]/toggle/route.ts',
  'sessions/export/route.ts',
  'sessions/[id]/chat/route.ts',
  'sessions/[id]/files/route.ts',
  'sessions/[id]/timeline/route.ts',
  'users/mechanics/[id]/route.ts',
  'users/[id]/free-session-override/route.ts',
  'users/[id]/notes/route.ts',
  'users/[id]/verify-email/route.ts',
  'workshops/applications/route.ts',
  'workshops/[id]/approve/route.ts',
  'workshops/[id]/reactivate/route.ts',
  'workshops/[id]/reject/route.ts',
  'workshops/[id]/suspend/route.ts',
];

function addAuthToRoute(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Check if already has requireAdminAPI
    if (content.includes('requireAdminAPI') || content.includes('requireAdmin')) {
      return false;
    }

    // Step 1: Add import after NextRequest/NextResponse import
    if (!content.includes("from '@/lib/auth/guards'")) {
      const nextServerImport = content.match(/import \{ (?:NextRequest,? )?(?:NextResponse)? \} from ['"]next\/server['"]/);
      if (nextServerImport) {
        content = content.replace(
          nextServerImport[0],
          nextServerImport[0] + "\nimport { requireAdminAPI } from '@/lib/auth/guards'"
        );
      }
    }

    // Step 2: Add auth check to each handler function
    // Match: export async function (GET|POST|PUT|DELETE|PATCH)(...) {
    const handlerRegex = /export async function (GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{/g;

    let match;
    const matches = [];
    while ((match = handlerRegex.exec(content)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        method: match[1],
        text: match[0]
      });
    }

    // Process matches in reverse to maintain correct indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      const functionStart = m.index + m.length;

      // Check next 500 chars to see if auth is already there
      const nextChars = content.substring(functionStart, functionStart + 500);
      if (nextChars.includes('requireAdminAPI') || nextChars.includes('requireAdmin')) {
        continue; // Already has auth
      }

      // Check if there's a try block immediately
      const hasTry = nextChars.trim().startsWith('try');

      const authCode = hasTry
        ? `\n    // ✅ SECURITY: Require admin authentication\n    const authResult = await requireAdminAPI(req)\n    if (authResult.error) return authResult.error\n\n    const admin = authResult.data\n`
        : `\n  try {\n    // ✅ SECURITY: Require admin authentication\n    const authResult = await requireAdminAPI(req)\n    if (authResult.error) return authResult.error\n\n    const admin = authResult.data\n`;

      content = content.substring(0, functionStart) + authCode + content.substring(functionStart);
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error securing ${filePath}:`, error.message);
    return false;
  }
}

let secured = 0;
let skipped = 0;

console.log('\n' + '='.repeat(60));
console.log('SECURING UNPROTECTED ADMIN ROUTES');
console.log('='.repeat(60) + '\n');

unprotectedRoutes.forEach(route => {
  const fullPath = path.join(ADMIN_DIR, route);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${route}`);
    skipped++;
    return;
  }

  const changed = addAuthToRoute(fullPath);
  if (changed) {
    console.log(`✓ SECURED: ${route}`);
    secured++;
  } else {
    console.log(`SKIP (already secured): ${route}`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('SECURITY UPGRADE SUMMARY');
console.log('='.repeat(60));
console.log(`Routes secured: ${secured}`);
console.log(`Routes skipped: ${skipped}`);
console.log(`Total: ${secured + skipped}`);
console.log('='.repeat(60) + '\n');
