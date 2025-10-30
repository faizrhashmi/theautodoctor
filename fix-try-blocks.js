const fs = require('fs');
const path = require('path');

const ADMIN_DIR = 'c:\\Users\\Faiz Hashmi\\theautodoctor\\src\\app\\api\\admin';

// Files with broken try blocks
const filesToFix = [
  'mechanic-documents/route.ts',
  'mechanics/[id]/request_info/route.ts',
  'mechanics/applications/route.ts',
  'sessions/[id]/timeline/route.ts',
  'users/[id]/free-session-override/route.ts',
];

function fixTryBlock(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Pattern: Remove "try {" that was incorrectly added after auth check
    // Look for: const admin = authResult.data\n\n  try {
    content = content.replace(
      /const admin = authResult\.data\s*\n\s*try \{/g,
      'const admin = authResult.data'
    );

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

let fixed = 0;
let skipped = 0;

console.log('\n' + '='.repeat(60));
console.log('FIXING BROKEN TRY BLOCKS');
console.log('='.repeat(60) + '\n');

filesToFix.forEach(file => {
  const fullPath = path.join(ADMIN_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    skipped++;
    return;
  }

  const changed = fixTryBlock(fullPath);
  if (changed) {
    console.log(`✓ FIXED: ${file}`);
    fixed++;
  } else {
    console.log(`SKIP (no changes): ${file}`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('FIX SUMMARY');
console.log('='.repeat(60));
console.log(`Files fixed: ${fixed}`);
console.log(`Files skipped: ${skipped}`);
console.log(`Total: ${fixed + skipped}`);
console.log('='.repeat(60) + '\n');
