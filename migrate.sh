#!/bin/bash

# Script to migrate mechanics API routes to requireMechanicAPI

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
  if [ ! -f "$file" ]; then
    echo "File not found: $file"
    continue
  fi
  
  if grep -q "requireMechanicAPI" "$file"; then
    echo "Already migrated: $file"
    continue
  fi
  
  echo "Migrating: $file"
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Add import after supabaseAdmin import
  sed -i "/from '@\/lib\/supabaseAdmin'/a import { requireMechanicAPI } from '@/lib/auth/guards'" "$file"
  
  # Replace session.mechanic_id with mechanic.id globally
  sed -i 's/session\.mechanic_id/mechanic.id/g' "$file"
  
  echo "  ✓ Migrated: $file"
done

echo "Migration complete!"
