# PowerShell script to migrate all admin routes from old requireAdmin to new requireAdminAPI

$adminDir = "c:\Users\Faiz Hashmi\theautodoctor\src\app\api\admin"
$filesChanged = 0
$totalChanges = 0

# Find all route files that import requireAdmin
Get-ChildItem -Path $adminDir -Recurse -Filter "route.ts" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw

    # Skip login route (intentionally public)
    if ($file -like "*\login\route.ts") {
        Write-Host "SKIP: $file (login route should remain public)" -ForegroundColor Yellow
        return
    }

    $originalContent = $content
    $changed = $false

    # Pattern 1: Replace import statement
    if ($content -match "from '@/lib/auth/requireAdmin'") {
        $content = $content -replace "from '@/lib/auth/requireAdmin'", "from '@/lib/auth/guards'"
        $content = $content -replace "import \{ requireAdmin \}", "import { requireAdminAPI }"
        $changed = $true
    }

    # Pattern 2: Replace auth check pattern
    if ($content -match "const auth = await requireAdmin\(") {
        $content = $content -replace "const auth = await requireAdmin\(", "const authResult = await requireAdminAPI("
        $changed = $true
    }

    # Pattern 3: Replace error handling
    if ($content -match "if \(\!auth\.authorized\) \{\s*return auth\.response!\s*\}") {
        $content = $content -replace "if \(\!auth\.authorized\) \{\s*return auth\.response!\s*\}", "if (authResult.error) return authResult.error`n`n    const admin = authResult.data"
        $changed = $true
    }

    # Pattern 4: Replace auth.user references
    $content = $content -replace "auth\.user!\.id", "admin.id"
    $content = $content -replace "auth\.user\.id", "admin.id"

    # Pattern 5: Replace auth.profile references
    $content = $content -replace "auth\.profile\?\.full_name", "admin.email"
    $content = $content -replace "auth\.profile\?\.email", "admin.email"
    $content = $content -replace "auth\.profile\.full_name", "admin.email"
    $content = $content -replace "auth\.profile\.email", "admin.email"

    # Pattern 6: Update security comments
    $content = $content -replace "// ✅ SECURITY FIX: Require admin authentication", "// ✅ SECURITY: Require admin authentication"
    $content = $content -replace "// ✅ Require admin authentication", "// ✅ SECURITY: Require admin authentication"

    # Pattern 7: Fix undefined 'user' references (common bug)
    $content = $content -replace "cancelled_by: user\.id", "cancelled_by: admin.id"
    $content = $content -replace "force_ended_by: user\.id", "force_ended_by: admin.id"
    $content = $content -replace "admin_id: user\.id", "admin_id: admin.id"

    if ($content -ne $originalContent) {
        Set-Content -Path $file -Value $content -NoNewline
        $filesChanged++
        $totalChanges++
        Write-Host "MIGRATED: $file" -ForegroundColor Green
    }
}

Write-Host "`n===== MIGRATION SUMMARY =====" -ForegroundColor Cyan
Write-Host "Files migrated: $filesChanged" -ForegroundColor Green
Write-Host "Total changes: $totalChanges" -ForegroundColor Green
Write-Host "============================`n" -ForegroundColor Cyan
