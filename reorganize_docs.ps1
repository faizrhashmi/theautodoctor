# Documentation Reorganization Script
# This script moves all .md files from root to appropriate documentation folders

$rootPath = "c:/Users/Faiz Hashmi/theautodoctor"
$docPath = "$rootPath/documentation"

Write-Host "Starting documentation reorganization..." -ForegroundColor Green

# Create subdirectories if they don't exist
$folders = @(
    "00-summaries-analysis",
    "12-legal-compliance",
    "13-archived"
)

foreach ($folder in $folders) {
    $path = "$docPath/$folder"
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "Created: $folder" -ForegroundColor Cyan
    }
}

# Files to move to 00-summaries-analysis
$analysisFiles = @(
    "BUSINESS_LOGIC_FINAL_REPORT.md",
    "DEVELOPMENT_EFFORT_AND_COST_ANALYSIS.md",
    "BREAK_EVEN_ANALYSIS_DETAILED.md",
    "AUDIT_CLAIMS_FINAL_VERDICT.md",
    "CODEBASE_AUDIT_REPORT.md",
    "BUSINESS_LOGIC_ANALYSIS_AND_RECOMMENDATIONS.md",
    "CODEBASE_AUDIT_REPORT_UPDATES.md",
    "CODEBASE_AUDIT_REPORT_UPDATE_2025-11-08.md",
    "DAILY_WORK_SUMMARY_2025-11-08.md",
    "REPORT_GENERATION_VERIFICATION.md",
    "STRIPE_CONNECT_PAYMENT_SPLITS_ANALYSIS.md",
    "COMPREHENSIVE_FIX_PLAN.md",
    "SCHEMA_ANALYSIS_PART1.md"
)

Write-Host "`nMoving analysis and summary files..." -ForegroundColor Yellow
foreach ($file in $analysisFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/00-summaries-analysis/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 12-legal-compliance
$legalFiles = @(
    "CUSTOMER_OWNERSHIP_LEGAL_ANALYSIS.md",
    "LEGAL_COMPLIANT_DUAL_MODE_SOLUTION.md",
    "WORKSHOP_MECHANICS_EXECUTIVE_REPORT.md",
    "VIRTUAL_VS_WORKSHOP_MECHANICS_POLICY.md",
    "WORKSHOP_MECHANIC_BUSINESS_MODEL.md",
    "ACCOUNT_SEPARATION_EXPLANATION.md"
)

Write-Host "`nMoving legal and compliance files..." -ForegroundColor Yellow
foreach ($file in $legalFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/12-legal-compliance/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 08-business-strategy/progress-reports
$progressFiles = @(
    "IMPLEMENTATION_PROGRESS.md",
    "IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md",
    "PHASE1_COMPLETE_NEXT_STEPS.md",
    "PHASE4_ANALYSIS_REPORT.md",
    "PHASE4_COMPLETE.md"
)

Write-Host "`nMoving progress reports..." -ForegroundColor Yellow
foreach ($file in $progressFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/08-business-strategy/progress-reports/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 08-business-strategy/feature-roadmap
$roadmapFiles = @(
    "FINAL_IMPLEMENTATION_PLAN.md",
    "IMMEDIATE_ACTION_PLAN.md",
    "FINAL_SEAMLESS_INTEGRATION_PLAN.md",
    "WORKSHOP_IMPLEMENTATION_PLAN.md",
    "SMART_WORKSHOP_SOLUTION.md",
    "TRUST_BASED_WORKSHOP_SOLUTION.md",
    "FINAL_REALISTIC_WORKSHOP_SOLUTION.md",
    "ULTIMATE_MECHANIC_SELECTION_PLAN.md"
)

Write-Host "`nMoving roadmap and planning files..." -ForegroundColor Yellow
foreach ($file in $roadmapFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/08-business-strategy/feature-roadmap/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 06-bug-fixes
$bugFixFiles = @(
    "CRITICAL_BUGS_FOUND.md",
    "BUGS_FIXED.md",
    "COMPLETION_MODAL_FIX.md",
    "VIDEO_SESSION_MECHANIC_NAME_BUG.md",
    "VIDEO_SESSION_MECHANIC_NAME_FIX_APPLIED.md",
    "TAGS_PANEL_MOBILE_UPDATE.md",
    "PRIVACY_FIXES_IMPLEMENTED.md"
)

Write-Host "`nMoving bug fix documentation..." -ForegroundColor Yellow
foreach ($file in $bugFixFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/06-bug-fixes/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/inspection-controls
$inspectionFiles = @(
    "PROFESSIONAL_INSPECTION_CONTROLS_PLAN.md",
    "PROFESSIONAL_INSPECTION_CONTROLS_IMPLEMENTATION.md",
    "INSPECTION_CONTROLS_BUGS_FIXED.md",
    "INSPECTION_CONTROLS_ANALYSIS_AND_RECOMMENDATIONS.md",
    "INSPECTION_CONTROLS_IMPLEMENTATION_REPORT.md",
    "INSPECTION_CONTROLS_COMPREHENSIVE_UPDATE.md"
)

$inspectionPath = "$docPath/02-feature-documentation/inspection-controls"
if (-not (Test-Path $inspectionPath)) {
    New-Item -ItemType Directory -Path $inspectionPath -Force | Out-Null
}

Write-Host "`nMoving inspection controls documentation..." -ForegroundColor Yellow
foreach ($file in $inspectionFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $inspectionPath -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/session-management
$sessionFiles = @(
    "SESSION_END_LOGIC_INSPECTION_SUMMARY.md",
    "SESSION_END_LOGIC_VERIFICATION_REPORT.md",
    "SESSION_EXECUTION_ACTUAL_STATE_REPORT.md",
    "SESSION_DYNAMIC_PRICING_UPDATE.md",
    "SESSION_WIZARD_ENHANCEMENT_PLAN.md",
    "SESSIONWIZARD_REDESIGN_PROPOSAL.md",
    "SESSIONWIZARD_TESTING_PLAN.md"
)

Write-Host "`nMoving session management documentation..." -ForegroundColor Yellow
foreach ($file in $sessionFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/02-feature-documentation/session-management/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/mechanic-matching
$matchingFiles = @(
    "MECHANIC_MATCHING_AUDIT.md",
    "MECHANIC_MATCHING_ISSUES_AND_FIXES.md",
    "MECHANIC_SELECTION_IMPLEMENTATION_SUMMARY.md",
    "MECHANIC_SELECTION_COMPLETION_SUMMARY.md",
    "MECHANIC_DASHBOARD_ACCESS_ANALYSIS.md",
    "THREE_TIER_MECHANIC_TESTING_PLAN.md"
)

$matchingPath = "$docPath/02-feature-documentation/mechanic-matching"
if (-not (Test-Path $matchingPath)) {
    New-Item -ItemType Directory -Path $matchingPath -Force | Out-Null
}

Write-Host "`nMoving mechanic matching documentation..." -ForegroundColor Yellow
foreach ($file in $matchingFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $matchingPath -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/customer-portal
$customerFiles = @(
    "VEHICLE_ADD_FLOW_ANALYSIS.md",
    "VEHICLE_ADD_IMPLEMENTATION_SUMMARY.md",
    "CONTACT_INFO_PRIVACY_AUDIT.md",
    "SIGNUP_FLOW_AUDIT_REPORT.md"
)

Write-Host "`nMoving customer portal documentation..." -ForegroundColor Yellow
foreach ($file in $customerFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/02-feature-documentation/customer-portal/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/admin-panel
$adminFiles = @(
    "ADMIN_PLANS_CRUD_COMPLETE.md"
)

Write-Host "`nMoving admin panel documentation..." -ForegroundColor Yellow
foreach ($file in $adminFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/02-feature-documentation/admin-panel/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/pricing-system
$pricingFiles = @(
    "DYNAMIC_PRICING_TESTING_GUIDE.md",
    "DYNAMIC_PRICING_IMPLEMENTATION_SUMMARY.md",
    "DYNAMIC_PRICING_COMPLETE_REPORT.md",
    "PLATFORM_FEE_IMPLEMENTATION_COMPLETE.md"
)

$pricingPath = "$docPath/02-feature-documentation/pricing-system"
if (-not (Test-Path $pricingPath)) {
    New-Item -ItemType Directory -Path $pricingPath -Force | Out-Null
}

Write-Host "`nMoving pricing system documentation..." -ForegroundColor Yellow
foreach ($file in $pricingFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $pricingPath -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 02-feature-documentation/mechanic-portal
$mechanicPortalFiles = @(
    "MECHANIC_REFERRAL_SYSTEM_IMPLEMENTATION.md"
)

Write-Host "`nMoving mechanic portal documentation..." -ForegroundColor Yellow
foreach ($file in $mechanicPortalFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/02-feature-documentation/mechanic-portal/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 11-migration-deployment
$migrationFiles = @(
    "MIGRATION_SETUP_GUIDE.md",
    "MIGRATION_WORKFLOW_GUIDE.md",
    "MIGRATION_SETUP_COMPLETE.md",
    "MIGRATION_SYNC_SOLUTION.md",
    "MANUAL_SYNC_PROCEDURE.md"
)

Write-Host "`nMoving migration and deployment files..." -ForegroundColor Yellow
foreach ($file in $migrationFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/11-migration-deployment/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 01-project-setup
$setupFiles = @(
    "QUICK_START.md",
    "DOCKER_SETUP_GUIDE.md"
)

Write-Host "`nMoving project setup files..." -ForegroundColor Yellow
foreach ($file in $setupFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/01-project-setup/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 05-testing-debugging
$testingFiles = @(
    "TESTING_GUIDE.md"
)

Write-Host "`nMoving testing documentation..." -ForegroundColor Yellow
foreach ($file in $testingFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/05-testing-debugging/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 11-migration-deployment/troubleshooting
$troubleshootingFiles = @(
    "SUPABASE_CONNECTION_DIAGNOSIS.md"
)

$troubleshootingPath = "$docPath/11-migration-deployment/troubleshooting"
if (-not (Test-Path $troubleshootingPath)) {
    New-Item -ItemType Directory -Path $troubleshootingPath -Force | Out-Null
}

Write-Host "`nMoving troubleshooting documentation..." -ForegroundColor Yellow
foreach ($file in $troubleshootingFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination $troubleshootingPath -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

# Files to move to 13-archived (superseded/old docs)
$archivedFiles = @(
    "RESUME_TOMORROW.md",
    "PARTNERSHIP_SYSTEM_REMOVAL_COMPLETE.md",
    "FINAL_STATUS_AND_RECOMMENDATIONS.md",
    "FINAL_RECOMMENDATION.md"
)

Write-Host "`nMoving archived files..." -ForegroundColor Yellow
foreach ($file in $archivedFiles) {
    $source = "$rootPath/$file"
    if (Test-Path $source) {
        Move-Item -Path $source -Destination "$docPath/13-archived/" -Force
        Write-Host "  Moved: $file" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Documentation reorganization complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

# List remaining .md files in root
Write-Host "Remaining .md files in root directory:" -ForegroundColor Cyan
Get-ChildItem -Path $rootPath -Filter "*.md" -File | ForEach-Object {
    Write-Host "  $($_.Name)" -ForegroundColor Yellow
}
