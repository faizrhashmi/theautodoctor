#!/bin/bash

# Complete migration script - replace legacy auth with requireMechanicAPI

files=(
  "src/app/api/mechanics/analytics/route.ts"
  "src/app/api/mechanics/availability/route.ts"
  "src/app/api/mechanics/bay-bookings/route.ts"
  "src/app/api/mechanics/clients/[clientId]/route.ts"
  "src/app/api/mechanics/earnings/route.ts"
  "src/app/api/mechanics/jobs/route.ts"
  "src/app/api/mechanics/onboarding/service-tier/route.ts"
  "src/app/api/mechanics/onboarding/virtual-only/route.ts"
  "src/app/api/mechanics/partnerships/applications/route.ts"
  "src/app/api/mechanics/partnerships/programs/route.ts"
  "src/app/api/mechanics/requests/history/route.ts"
  "src/app/api/mechanics/requests/[id]/cancel/route.ts"
  "src/app/api/mechanics/sessions/virtual/route.ts"
  "src/app/api/mechanics/statements/route.ts"
  "src/app/api/mechanics/stripe/onboard/route.ts"
)

for file in "${files[@]}"; do
  echo "Processing: $file"
  
  # Use perl for multi-line replacements (more reliable than sed for this)
  perl -i -pe 'BEGIN{undef $/;} s/const token = req\.cookies\.get\('"'"'aad_mech'"'"'\)\?\.value\s*\n\s*\n\s*if \(!token\) \{\s*\n\s*return NextResponse\.json\(\{ error: '"'"'Not authenticated'"'"' \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n\s*\n\s*if \(!supabaseAdmin\) \{\s*\n\s*return NextResponse\.json\(\{ error: '"'"'Server configuration error'"'"' \}, \{ status: 500 \}\)\s*\n\s*\}\s*\n\s*\n\s*try \{\s*\n\s*\/\/ Validate session\s*\n\s*const \{ data: session, error: sessionError \} = await supabaseAdmin\s*\n\s*\.from\('"'"'mechanic_sessions'"'"'\)\s*\n\s*\.select\('"'"'mechanic_id, expires_at'"'"'\)\s*\n\s*\.eq\('"'"'token'"'"', token\)\s*\n\s*\.single\(\)\s*\n\s*\n\s*if \(sessionError \|\| !session\) \{\s*\n\s*return NextResponse\.json\(\{ error: '"'"'Invalid session'"'"' \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n\s*\n\s*\/\/ Check if session is expired\s*\n\s*if \(new Date\(session\.expires_at\) < new Date\(\)\) \{\s*\n\s*return NextResponse\.json\(\{ error: '"'"'Session expired'"'"' \}, \{ status: 401 \}\)\s*\n\s*\}/\/\/ ✅ SECURITY: Require mechanic authentication\n  const authResult = await requireMechanicAPI(req)\n  if (authResult.error) return authResult.error\n\n  const mechanic = authResult.data\n\n  if (!supabaseAdmin) {\n    return NextResponse.json({ error: '"'"'Server configuration error'"'"' }, { status: 500 })\n  }\n\n  try {/g' "$file"
  
  echo "  ✓ Completed: $file"
done

echo "Complete migration finished!"
