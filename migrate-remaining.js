const fs = require('fs');
const path = require('path');

const ADMIN_DIR = 'c:\\Users\\Faiz Hashmi\\theautodoctor\\src\\app\\api\\admin';

// Files with old requireAdmin that need migration
const filesToMigrate = [
  'claims/[id]/approve/route.ts',
  'claims/[id]/reject/route.ts',
  'corporate/[id]/approve/route.ts',
  'fees/rules/[ruleId]/route.ts',
  'mechanics/[id]/approve/route.ts',
  'mechanics/[id]/reject/route.ts',
  'plans/[id]/route.ts',
  'requests/[id]/assign/route.ts',
  'users/[id]/notify/route.ts',
];

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Step 1: Replace import
    content = content.replace("from '@/lib/auth/requireAdmin'", "from '@/lib/auth/guards'");
    content = content.replace(/import \{ requireAdmin \}/g, "import { requireAdminAPI }");

    // Step 2: Replace auth initialization
    content = content.replace(/const auth = await requireAdmin\(/g, "const authResult = await requireAdminAPI(");

    // Step 3: Replace error handling
    content = content.replace(
      /if \(!auth\.authorized\) \{\s*return auth\.response!\s*\}/g,
      "if (authResult.error) return authResult.error\n\n    const admin = authResult.data"
    );

    // Step 4: Replace auth.user references
    content = content.replace(/auth\.user!\.id/g, "admin.id");
    content = content.replace(/auth\.user\.id/g, "admin.id");

    // Step 5: Replace auth.profile references
    content = content.replace(/auth\.profile\?\.full_name/g, "admin.email");
    content = content.replace(/auth\.profile\?\.email/g, "admin.email");
    content = content.replace(/auth\.profile\.full_name/g, "admin.email");
    content = content.replace(/auth\.profile\.email/g, "admin.email");

    // Step 6: Update security comments
    content = content.replace(/\/\/ ✅ SECURITY FIX: Require admin authentication/g, "// ✅ SECURITY: Require admin authentication");

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error migrating ${filePath}:`, error.message);
    return false;
  }
}

let migrated = 0;
let skipped = 0;

console.log('\n' + '='.repeat(60));
console.log('MIGRATING OLD requireAdmin TO requireAdminAPI');
console.log('='.repeat(60) + '\n');

filesToMigrate.forEach(file => {
  const fullPath = path.join(ADMIN_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    skipped++;
    return;
  }

  const changed = migrateFile(fullPath);
  if (changed) {
    console.log(`✓ MIGRATED: ${file}`);
    migrated++;
  } else {
    console.log(`SKIP (no changes): ${file}`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('MIGRATION SUMMARY');
console.log('='.repeat(60));
console.log(`Files migrated: ${migrated}`);
console.log(`Files skipped: ${skipped}`);
console.log(`Total: ${migrated + skipped}`);
console.log('='.repeat(60) + '\n');
