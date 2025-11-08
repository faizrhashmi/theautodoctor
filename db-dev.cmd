@echo off
REM Quick Supabase Development Commands

if "%1"=="" goto help
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="reset" goto reset
if "%1"=="new" goto new
if "%1"=="push" goto push
if "%1"=="studio" goto studio
if "%1"=="status" goto status
goto help

:start
echo Starting local Supabase...
pnpm supabase start
goto end

:stop
echo Stopping local Supabase...
pnpm supabase stop
goto end

:reset
echo Resetting local database (will reapply all migrations)...
pnpm supabase db reset
goto end

:new
if "%2"=="" (
    echo ERROR: Please provide a migration name
    echo Usage: db-dev new migration_name
    goto end
)
echo Creating new migration: %2
pnpm supabase migration new %2
goto end

:push
echo Deploying migrations to production...
echo.
echo WARNING: This will apply migrations to your LIVE database!
set /p confirm="Are you sure? (yes/no): "
if /i "%confirm%"=="yes" (
    pnpm supabase db push
) else (
    echo Cancelled.
)
goto end

:studio
echo Opening Supabase Studio...
start http://127.0.0.1:54323
goto end

:status
pnpm supabase status
goto end

:help
echo.
echo ========================================
echo   Supabase Development Helper
echo ========================================
echo.
echo Usage: db-dev [command]
echo.
echo Commands:
echo   start     - Start local Supabase (Docker)
echo   stop      - Stop local Supabase
echo   reset     - Reset local DB and reapply migrations
echo   new NAME  - Create a new migration file
echo   push      - Deploy migrations to production
echo   studio    - Open Supabase Studio in browser
echo   status    - Check Supabase status
echo.
echo Examples:
echo   db-dev start
echo   db-dev new add_user_table
echo   db-dev reset
echo   db-dev push
echo.

:end
