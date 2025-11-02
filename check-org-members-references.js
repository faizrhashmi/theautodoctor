/**
 * Check what references organization_members table
 * To ensure V2 fix won't break anything
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');

console.log('\n============================================');
console.log('Checking organization_members References');
console.log('============================================\n');

let findings = {
  policiesOnOrgMembers: [],
  policiesReferencingOrgMembers: [],
  functionsReferencingOrgMembers: [],
  viewsReferencingOrgMembers: []
};

// Read all migration files
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

  // Check for policies ON organization_members
  const onOrgMembersMatch = content.match(/CREATE POLICY .* ON organization_members/gi);
  if (onOrgMembersMatch) {
    findings.policiesOnOrgMembers.push({ file, count: onOrgMembersMatch.length });
  }

  // Check for policies that reference organization_members in USING/WITH CHECK
  const policyBlocks = content.match(/CREATE POLICY[\s\S]*?;/gi) || [];
  policyBlocks.forEach(block => {
    if (block.includes('organization_members') && !block.includes('ON organization_members')) {
      // This is a policy on ANOTHER table that references organization_members
      const tableName = block.match(/ON (\w+)/i)?.[1];
      if (tableName && tableName !== 'organization_members') {
        findings.policiesReferencingOrgMembers.push({
          file,
          table: tableName,
          snippet: block.substring(0, 100) + '...'
        });
      }
    }
  });

  // Check for functions that query organization_members
  const functionBlocks = content.match(/CREATE.*FUNCTION[\s\S]*?\$\$/gi) || [];
  functionBlocks.forEach(block => {
    if (block.includes('organization_members')) {
      const funcName = block.match(/FUNCTION (\w+)/i)?.[1];
      if (funcName && funcName !== 'user_organizations' && funcName !== 'is_org_owner_or_admin') {
        findings.functionsReferencingOrgMembers.push({ file, function: funcName });
      }
    }
  });
});

console.log('📊 Analysis Results:\n');

console.log(`1. Policies ON organization_members table:`);
console.log(`   Found in ${findings.policiesOnOrgMembers.length} files`);
findings.policiesOnOrgMembers.forEach(f => {
  console.log(`   - ${f.file}: ${f.count} policies`);
});

console.log(`\n2. Policies on OTHER tables that reference organization_members:`);
if (findings.policiesReferencingOrgMembers.length === 0) {
  console.log(`   ✅ None found - V2 won't affect other tables`);
} else {
  console.log(`   ⚠️  Found ${findings.policiesReferencingOrgMembers.length}:`);
  findings.policiesReferencingOrgMembers.forEach(f => {
    console.log(`   - Table: ${f.table} in ${f.file}`);
    console.log(`     ${f.snippet}`);
  });
}

console.log(`\n3. Functions that query organization_members:`);
if (findings.functionsReferencingOrgMembers.length === 0) {
  console.log(`   ✅ Only helper functions (user_organizations, is_org_owner_or_admin)`);
} else {
  console.log(`   Found ${findings.functionsReferencingOrgMembers.length}:`);
  findings.functionsReferencingOrgMembers.forEach(f => {
    console.log(`   - ${f.function} in ${f.file}`);
  });
}

console.log('\n============================================');
console.log('Safety Assessment:');
console.log('============================================\n');

if (findings.policiesReferencingOrgMembers.length === 0 &&
    findings.functionsReferencingOrgMembers.length === 0) {
  console.log('✅ SAFE TO APPLY V2 FIX');
  console.log('   - Only affects organization_members table policies');
  console.log('   - No other tables query organization_members in RLS');
  console.log('   - No unexpected function dependencies');
} else {
  console.log('⚠️  REVIEW REQUIRED');
  console.log('   - Other tables/functions reference organization_members');
  console.log('   - Check if they will be affected by policy changes');
}

console.log('\n============================================\n');
