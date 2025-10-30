#!/usr/bin/env python3
"""
Systematically add requireAdminAPI guard to all unprotected admin routes
"""
import os
import re
from pathlib import Path

ADMIN_DIR = r"c:\Users\Faiz Hashmi\theautodoctor\src\app\api\admin"

# List of unprotected routes (excluding login, logout, test-login, debug-auth which may be intentionally public)
UNPROTECTED_ROUTES = [
    "analytics/beta-program/route.ts",
    "analytics/workshop-health/[id]/route.ts",
    "analytics/workshop-overview/route.ts",
    "cleanup/history/route.ts",
    "cleanup/preview/route.ts",
    "cleanup-all-users/route.ts",
    "corporate/route.ts",
    "corporate/[id]/generate-invoice/route.ts",
    "corporate/[id]/reject/route.ts",
    "corporate/[id]/suspend/route.ts",
    "create-test-users/route.ts",
    "database/history/route.ts",
    "database/saved-queries/route.ts",
    "delete-user/route.ts",
    "errors/route.ts",
    "errors/[id]/route.ts",
    "fix-mechanics/route.ts",
    "health/route.ts",
    "intakes/export/route.ts",
    "intakes/[id]/route.ts",
    "intakes/[id]/status/route.ts",
    "logs/stats/route.ts",
    "mechanic-documents/route.ts",
    "mechanic-documents/[id]/review/route.ts",
    "mechanics/applications/route.ts",
    "mechanics/[id]/request_info/route.ts",
    "plans/[id]/toggle/route.ts",
    "sessions/export/route.ts",
    "sessions/[id]/chat/route.ts",
    "sessions/[id]/files/route.ts",
    "sessions/[id]/timeline/route.ts",
    "users/mechanics/[id]/route.ts",
    "users/[id]/free-session-override/route.ts",
    "users/[id]/notes/route.ts",
    "users/[id]/verify-email/route.ts",
    "workshops/applications/route.ts",
    "workshops/[id]/approve/route.ts",
    "workshops/[id]/reactivate/route.ts",
    "workshops/[id]/reject/route.ts",
    "workshops/[id]/suspend/route.ts",
]

# Remaining old requireAdmin routes
OLD_REQUIRE_ADMIN_ROUTES = [
    "claims/[id]/approve/route.ts",
    "claims/[id]/reject/route.ts",
    "corporate/[id]/approve/route.ts",
    "fees/rules/[ruleId]/route.ts",
    "mechanics/[id]/approve/route.ts",
    "mechanics/[id]/reject/route.ts",
    "plans/[id]/route.ts",
    "requests/[id]/assign/route.ts",
    "users/[id]/notify/route.ts",
]

def add_auth_to_route(file_path):
    """Add requireAdminAPI auth guard to a route file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Step 1: Add import if not present
    if 'requireAdminAPI' not in content:
        # Find the import section
        if "import { NextRequest, NextResponse } from 'next/server'" in content:
            content = content.replace(
                "import { NextRequest, NextResponse } from 'next/server'",
                "import { NextRequest, NextResponse } from 'next/server'\nimport { requireAdminAPI } from '@/lib/auth/guards'"
            )
        elif 'import { NextRequest, NextResponse } from "next/server"' in content:
            content = content.replace(
                'import { NextRequest, NextResponse } from "next/server"',
                'import { NextRequest, NextResponse } from "next/server"\nimport { requireAdminAPI } from \'@/lib/auth/guards\''
            )

    # Step 2: Add auth check to each handler function (GET, POST, PUT, DELETE, PATCH)
    handler_pattern = r'(export async function (GET|POST|PUT|DELETE|PATCH)\([^)]*\)(?:\s*:\s*[^{]+)?\s*\{)\s*(\n\s*try\s*\{)?'

    def add_auth_check(match):
        func_signature = match.group(1)
        has_try = match.group(3)

        # Check if auth already exists in the function
        # Look ahead to see if requireAdminAPI is already called
        func_start_pos = match.start()
        func_content = content[func_start_pos:func_start_pos+500]  # Check first 500 chars

        if 'requireAdminAPI' in func_content or 'requireAdmin' in func_content:
            return match.group(0)  # Already has auth

        if has_try:
            return f"{func_signature}{has_try}\n    // ✅ SECURITY: Require admin authentication\n    const authResult = await requireAdminAPI(req)\n    if (authResult.error) return authResult.error\n\n    const admin = authResult.data\n"
        else:
            return f"{func_signature}\n  try {{\n    // ✅ SECURITY: Require admin authentication\n    const authResult = await requireAdminAPI(req)\n    if (authResult.error) return authResult.error\n\n    const admin = authResult.data\n"

    content = re.sub(handler_pattern, add_auth_check, content)

    # Return True if file was modified
    return content, content != original_content

def migrate_old_require_admin(file_path):
    """Migrate from old requireAdmin to requireAdminAPI"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace import
    content = content.replace("from '@/lib/auth/requireAdmin'", "from '@/lib/auth/guards'")
    content = content.replace('import { requireAdmin }', 'import { requireAdminAPI }')

    # Replace auth check pattern
    content = content.replace('const auth = await requireAdmin(', 'const authResult = await requireAdminAPI(')
    content = re.sub(
        r'if \(\!auth\.authorized\) \{\s*return auth\.response!\s*\}',
        'if (authResult.error) return authResult.error\n\n    const admin = authResult.data',
        content
    )

    # Replace references
    content = content.replace('auth.user!.id', 'admin.id')
    content = content.replace('auth.user.id', 'admin.id')
    content = content.replace('auth.profile?.full_name', 'admin.email')
    content = content.replace('auth.profile?.email', 'admin.email')
    content = content.replace('auth.profile.full_name', 'admin.email')
    content = content.replace('auth.profile.email', 'admin.email')

    return content, content != original_content

def main():
    files_migrated = 0
    files_skipped = 0

    print("\n" + "="*60)
    print("MIGRATING UNPROTECTED ROUTES (Adding requireAdminAPI)")
    print("="*60 + "\n")

    for route in UNPROTECTED_ROUTES:
        file_path = os.path.join(ADMIN_DIR, route.replace('/', os.sep))
        if not os.path.exists(file_path):
            print(f"SKIP (not found): {route}")
            files_skipped += 1
            continue

        new_content, changed = add_auth_to_route(file_path)
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ SECURED: {route}")
            files_migrated += 1
        else:
            print(f"SKIP (already secured): {route}")
            files_skipped += 1

    print("\n" + "="*60)
    print("MIGRATING OLD requireAdmin IMPORTS")
    print("="*60 + "\n")

    for route in OLD_REQUIRE_ADMIN_ROUTES:
        file_path = os.path.join(ADMIN_DIR, route.replace('/', os.sep))
        if not os.path.exists(file_path):
            print(f"SKIP (not found): {route}")
            files_skipped += 1
            continue

        new_content, changed = migrate_old_require_admin(file_path)
        if changed:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ MIGRATED: {route}")
            files_migrated += 1
        else:
            print(f"SKIP (already migrated): {route}")
            files_skipped += 1

    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    print(f"Files migrated: {files_migrated}")
    print(f"Files skipped: {files_skipped}")
    print(f"Total processed: {files_migrated + files_skipped}")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
