const fs = require('fs');
const path = require('path');

const ADMIN_DIR = 'c:\\Users\\Faiz Hashmi\\theautodoctor\\src\\app\\api\\admin';

// Files that still have dual auth/nested try blocks
const filesToFix = [
  'mechanics/[id]/request_info/route.ts',
  'mechanics/applications/route.ts',
  'sessions/[id]/timeline/route.ts',
  'users/[id]/free-session-override/route.ts',
];

function cleanDualAuth(content) {
  // Remove old admin session token validation code that comes after requireAdminAPI
  content = content.replace(
    /const admin = authResult\.data\s*\n\s*const token = req\.cookies\.get\('admin_session_token'\)\?\.value[\s\S]*?if \(!supabaseAdmin\) \{[\s\S]*?\}\s*try \{\s*\/\/ Validate admin session[\s\S]*?if \(new Date\(session\.expires_at\) < new Date\(\)\) \{[\s\S]*?\}/g,
    'const admin = authResult.data'
  );

  // Remove session references to old auth
  content = content.replace(/session\.admin_id/g, 'admin.id');

  return content;
}

let fixed = 0;
let failed = 0;

console.log('\n' + '='.repeat(60));
console.log('CLEANING DUAL AUTH & NESTED TRY BLOCKS');
console.log('='.repeat(60) + '\n');

filesToFix.forEach(file => {
  const fullPath = path.join(ADMIN_DIR, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`SKIP (not found): ${file}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const original = content;

    content = cleanDualAuth(content);

    if (content !== original) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✓ FIXED: ${file}`);
      fixed++;
    } else {
      console.log(`SKIP (no changes): ${file}`);
    }
  } catch (error) {
    console.error(`✗ FAILED: ${file} - ${error.message}`);
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('FINAL FIX SUMMARY');
console.log('='.repeat(60));
console.log(`Files fixed: ${fixed}`);
console.log(`Files failed: ${failed}`);
console.log('='.repeat(60) + '\n');
