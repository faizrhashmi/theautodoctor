#!/usr/bin/env python3
"""
Script to migrate mechanic API routes from legacy aad_mech cookie auth to requireMechanicAPI
"""
import re
import os

def migrate_file(filepath):
    """Migrate a single route file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already migrated
    if 'requireMechanicAPI' in content:
        print(f"  ✓ Already migrated: {filepath}")
        return False

    # Add import if not present
    if 'requireMechanicAPI' not in content:
        # Find the import section
        import_pattern = r"(import.*from '@/lib/supabaseAdmin')"
        if re.search(import_pattern, content):
            content = re.sub(
                import_pattern,
                r"\1\nimport { requireMechanicAPI } from '@/lib/auth/guards'",
                content,
                count=1
            )

    # Remove cookies import if only used for auth
    content = re.sub(r"import \{ cookies \} from 'next/headers'\n?", "", content)

    # Pattern 1: Replace cookie token retrieval
    content = re.sub(
        r"const token = req\.cookies\.get\('aad_mech'\)\?\.value\s*\n\s*\n\s*if \(!token\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Not authenticated' \}, \{ status: 401 \}\)\s*\n\s*\}",
        "",
        content,
        flags=re.MULTILINE
    )

    # Pattern 2: Replace session validation block
    session_validation = r"""// Validate session
    const \{ data: session, error: sessionError \} = await supabaseAdmin
      \.from\('mechanic_sessions'\)
      \.select\('mechanic_id, expires_at'\)
      \.eq\('token', token\)
      \.single\(\)

    if \(sessionError \|\| !session\) \{
      return NextResponse\.json\(\{ error: 'Invalid session' \}, \{ status: 401 \}\)
    \}

    // Check if session is expired
    if \(new Date\(session\.expires_at\) < new Date\(\)\) \{
      return NextResponse\.json\(\{ error: 'Session expired' \}, \{ status: 401 \}\)
    \}"""

    content = re.sub(session_validation, "", content, flags=re.MULTILINE | re.DOTALL)

    # Simpler pattern
    content = re.sub(
        r"\s*// Validate session.*?Session expired.*?\n\s*\}",
        "",
        content,
        flags=re.DOTALL
    )

    # Replace session.mechanic_id with mechanic.id
    content = re.sub(r"session\.mechanic_id", "mechanic.id", content)

    # Add auth guard at start of each handler function
    # Match function declarations
    handler_pattern = r"(export async function (?:GET|POST|PUT|DELETE|PATCH)\([^)]*\) \{)\s*\n(\s*)const token"

    def add_auth_guard(match):
        func_start = match.group(1)
        indent = match.group(2)
        return f"""{func_start}
{indent}// ✅ SECURITY: Require mechanic authentication
{indent}const authResult = await requireMechanicAPI(req)
{indent}if (authResult.error) return authResult.error

{indent}const mechanic = authResult.data

{indent}const token"""

    # content = re.sub(handler_pattern, add_auth_guard, content, flags=re.MULTILINE)

    # Write the migrated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ Migrated: {filepath}")
    return True

# Files to migrate
files = [
    "src/app/api/mechanics/analytics/route.ts",
    "src/app/api/mechanics/availability/route.ts",
    "src/app/api/mechanics/bay-bookings/route.ts",
    "src/app/api/mechanics/clients/[clientId]/route.ts",
    "src/app/api/mechanics/earnings/route.ts",
    "src/app/api/mechanics/jobs/route.ts",
    "src/app/api/mechanics/onboarding/service-tier/route.ts",
    "src/app/api/mechanics/onboarding/virtual-only/route.ts",
    "src/app/api/mechanics/partnerships/applications/route.ts",
    "src/app/api/mechanics/partnerships/programs/route.ts",
    "src/app/api/mechanics/requests/history/route.ts",
    "src/app/api/mechanics/requests/[id]/cancel/route.ts",
    "src/app/api/mechanics/sessions/virtual/route.ts",
    "src/app/api/mechanics/statements/route.ts",
    "src/app/api/mechanics/stripe/onboard/route.ts",
]

if __name__ == "__main__":
    base = "C:\\Users\\Faiz Hashmi\\theautodoctor"
    migrated_count = 0

    print("Starting migration...")
    for file in files:
        filepath = os.path.join(base, file)
        if migrate_file(filepath):
            migrated_count += 1

    print(f"\nMigration complete! Migrated {migrated_count} files.")
