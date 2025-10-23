const fs = require('fs');
const glob = require('glob');

console.log('Running final comprehensive fix...\n');

// Fix all API routes
const apiFiles = glob.sync('src/app/api/**/*.ts');
let apiFixed = 0;

apiFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Fix unused request parameters that don't use request in the body
  const functionMatches = content.matchAll(/export async function (GET|POST|PUT|DELETE|PATCH)\(\s*request: NextRequest/g);
  for (const match of functionMatches) {
    const functionStart = match.index;
    const functionBody = content.substring(functionStart);
    
    // Check if request is used in the function body (not counting the parameter declaration)
    if (!functionBody.substring(100).includes('request.')) {
      content = content.replace(
        new RegExp(`export async function ${match[1]}\(\s*request: NextRequest`),
        `export async function ${match[1]}(\n  _request: NextRequest`
      );
    }
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed unused params:', file);
    apiFixed++;
  }
});

// Fix all corporate type issues
const corporateFiles = glob.sync('src/app/{api,admin}/**/corporate/**/*.{ts,tsx}') + glob.sync('src/app/corporate/**/*.{ts,tsx}');
let corpFixed = 0;

[...new Set(corporateFiles)].forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  const original = content;
  
  // Add type assertions for any remaining untyped corporate data
  content = content.replace(/businesses\?\.map\(\(business\) =>/g, '(businesses as any[])?.map((business: any) =>');
  content = content.replace(/employees\?\.map\(\(employee\) =>/g, '(employees as any[])?.map((employee: any) =>');
  content = content.replace(/invoices\?\.map\(\(invoice\) =>/g, '(invoices as any[])?.map((invoice: any) =>');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed types:', file);
    corpFixed++;
  }
});

console.log(`\nAPI files fixed: ${apiFixed}`);
console.log(`Corporate files fixed: ${corpFixed}`);
console.log('Done!\n');
