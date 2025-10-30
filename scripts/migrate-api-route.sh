#!/bin/bash

# API Route Migration Helper Script
# Usage: ./scripts/migrate-api-route.sh <path-to-file>
#
# This script helps migrate an API route from old auth (aad_mech) to Supabase Auth
# It performs find/replace operations to convert the authentication pattern

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-route-file>"
  echo "Example: $0 src/app/api/mechanic/dashboard/stats/route.ts"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE"
  exit 1
fi

echo "Migrating: $FILE"
echo "Creating backup..."
cp "$FILE" "$FILE.backup"

# Create a temporary file for modifications
TMP_FILE=$(mktemp)

# Step 1: Add import if not present
if ! grep -q "requireMechanicAPI" "$FILE"; then
  echo "Adding requireMechanicAPI import..."
  sed '/^import/a import { requireMechanicAPI } from '"'"'@/lib/auth/guards'"'"'' "$FILE" > "$TMP_FILE"
  mv "$TMP_FILE" "$FILE"
fi

# Step 2: Add cleanup comment at export
echo "Adding cleanup comment..."
sed -i 's/^export async function \(GET\|POST\|PUT\|DELETE\|PATCH\)(req: NextRequest)/\/\/ CLEANED UP: Migrated from old auth (aad_mech cookie) to Supabase Auth\nexport async function \1(req: NextRequest)/' "$FILE"

# Note: The actual code replacement is complex and varies by file
# This script provides the framework - manual review is still needed

echo ""
echo "✅ Import added and comment inserted"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Replace the old auth pattern (lines with aad_mech cookie check and mechanic_sessions query)"
echo "2. Add these lines after 'export async function ...'"
echo "   const result = await requireMechanicAPI(req)"
echo "   if (result.error) return result.error"
echo "   const mechanic = result.data"
echo ""
echo "3. Replace all occurrences of 'session.mechanic_id' with 'mechanic.id'"
echo ""
echo "4. Review and test the changes"
echo ""
echo "Backup created: $FILE.backup"
echo ""
echo "To restore backup: mv $FILE.backup $FILE"
