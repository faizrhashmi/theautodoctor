@echo off
REM Project Cleanup Preview Script (Windows)
REM Shows what files will be affected by cleanup

echo ========================================
echo   PROJECT CLEANUP PREVIEW
echo ========================================
echo.

echo Backup Files (will be deleted):
dir /s /b src\*.backup 2>nul | find /c /v ""
dir /s /b src\*.backup 2>nul
echo.

echo Test Pages (will be deleted):
if exist "src\app\test-auth" echo   X src\app\test-auth\
if exist "src\app\test-mechanics" echo   X src\app\test-mechanics\
if exist "src\app\test-new-features" echo   X src\app\test-new-features\
echo.

echo Patch Workspace (review then delete):
if exist "_aad_patch_workspace" (
    echo   ! _aad_patch_workspace\
    dir /s /b "_aad_patch_workspace\*.tsx" "_aad_patch_workspace\*.ts" 2>nul | find /c /v ""
)
echo.

echo Documentation Files (will be reorganized):
dir /b *.md 2>nul | find /c /v ""
echo   ^-^> Will be moved to docs\ subdirectories
echo.

echo Template Files (need review):
dir /s /b "src\app\*\template.tsx" 2>nul
echo.

echo ========================================
echo   QUICK COMMANDS
echo ========================================
echo.
echo To delete backup files:
echo   del /s src\*.backup
echo.
echo To delete test pages:
echo   rmdir /s /q src\app\test-auth
echo   rmdir /s /q src\app\test-mechanics
echo   rmdir /s /q src\app\test-new-features
echo.
echo Full details in PROJECT_CLEANUP_AUDIT.md
echo ========================================

pause
