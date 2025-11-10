#!/usr/bin/env python3
"""
Documentation Reorganization Script
Moves all .md files from root to appropriate documentation folders
"""

import os
import shutil
from pathlib import Path

# Base paths
ROOT_PATH = Path("c:/Users/Faiz Hashmi/theautodoctor")
DOC_PATH = ROOT_PATH / "documentation"

# Track statistics
stats = {
    "moved": 0,
    "skipped": 0,
    "errors": 0
}

def ensure_dir(path):
    """Create directory if it doesn't exist"""
    path.mkdir(parents=True, exist_ok=True)

def move_file(filename, destination_folder):
    """Move a file from root to destination folder"""
    source = ROOT_PATH / filename
    destination = DOC_PATH / destination_folder / filename

    if source.exists():
        try:
            ensure_dir(DOC_PATH / destination_folder)
            shutil.move(str(source), str(destination))
            print(f"✓ Moved: {filename} → {destination_folder}")
            stats["moved"] += 1
            return True
        except Exception as e:
            print(f"✗ Error moving {filename}: {e}")
            stats["errors"] += 1
            return False
    else:
        stats["skipped"] += 1
        return False

def main():
    print("=" * 60)
    print("DOCUMENTATION REORGANIZATION")
    print("=" * 60)

    # Create new directories
    print("\n[1/7] Creating new directory structure...")
    ensure_dir(DOC_PATH / "00-summaries-analysis")
    ensure_dir(DOC_PATH / "12-legal-compliance")
    ensure_dir(DOC_PATH / "13-archived")
    ensure_dir(DOC_PATH / "02-feature-documentation/inspection-controls")
    ensure_dir(DOC_PATH / "02-feature-documentation/mechanic-matching")
    ensure_dir(DOC_PATH / "02-feature-documentation/pricing-system")
    ensure_dir(DOC_PATH / "11-migration-deployment/troubleshooting")
    print("✓ Directory structure created")

    # Move files to 00-summaries-analysis
    print("\n[2/7] Moving analysis and summary files...")
    analysis_files = [
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
    ]
    for f in analysis_files:
        move_file(f, "00-summaries-analysis")

    # Move files to 12-legal-compliance
    print("\n[3/7] Moving legal and compliance files...")
    legal_files = [
        "CUSTOMER_OWNERSHIP_LEGAL_ANALYSIS.md",
        "LEGAL_COMPLIANT_DUAL_MODE_SOLUTION.md",
        "WORKSHOP_MECHANICS_EXECUTIVE_REPORT.md",
        "VIRTUAL_VS_WORKSHOP_MECHANICS_POLICY.md",
        "WORKSHOP_MECHANIC_BUSINESS_MODEL.md",
        "ACCOUNT_SEPARATION_EXPLANATION.md"
    ]
    for f in legal_files:
        move_file(f, "12-legal-compliance")

    # Move files to 08-business-strategy
    print("\n[4/7] Moving business strategy files...")

    progress_files = [
        "IMPLEMENTATION_PROGRESS.md",
        "IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md",
        "PHASE1_COMPLETE_NEXT_STEPS.md",
        "PHASE4_ANALYSIS_REPORT.md",
        "PHASE4_COMPLETE.md"
    ]
    for f in progress_files:
        move_file(f, "08-business-strategy/progress-reports")

    roadmap_files = [
        "FINAL_IMPLEMENTATION_PLAN.md",
        "IMMEDIATE_ACTION_PLAN.md",
        "FINAL_SEAMLESS_INTEGRATION_PLAN.md",
        "WORKSHOP_IMPLEMENTATION_PLAN.md",
        "SMART_WORKSHOP_SOLUTION.md",
        "TRUST_BASED_WORKSHOP_SOLUTION.md",
        "FINAL_REALISTIC_WORKSHOP_SOLUTION.md",
        "ULTIMATE_MECHANIC_SELECTION_PLAN.md"
    ]
    for f in roadmap_files:
        move_file(f, "08-business-strategy/feature-roadmap")

    # Move bug fixes
    print("\n[5/7] Moving bug fix documentation...")
    bugfix_files = [
        "CRITICAL_BUGS_FOUND.md",
        "BUGS_FIXED.md",
        "COMPLETION_MODAL_FIX.md",
        "VIDEO_SESSION_MECHANIC_NAME_BUG.md",
        "VIDEO_SESSION_MECHANIC_NAME_FIX_APPLIED.md",
        "TAGS_PANEL_MOBILE_UPDATE.md",
        "PRIVACY_FIXES_IMPLEMENTED.md"
    ]
    for f in bugfix_files:
        move_file(f, "06-bug-fixes")

    # Move feature documentation
    print("\n[6/7] Moving feature documentation...")

    inspection_files = [
        "PROFESSIONAL_INSPECTION_CONTROLS_PLAN.md",
        "PROFESSIONAL_INSPECTION_CONTROLS_IMPLEMENTATION.md",
        "INSPECTION_CONTROLS_BUGS_FIXED.md",
        "INSPECTION_CONTROLS_ANALYSIS_AND_RECOMMENDATIONS.md",
        "INSPECTION_CONTROLS_IMPLEMENTATION_REPORT.md",
        "INSPECTION_CONTROLS_COMPREHENSIVE_UPDATE.md"
    ]
    for f in inspection_files:
        move_file(f, "02-feature-documentation/inspection-controls")

    session_files = [
        "SESSION_END_LOGIC_INSPECTION_SUMMARY.md",
        "SESSION_END_LOGIC_VERIFICATION_REPORT.md",
        "SESSION_EXECUTION_ACTUAL_STATE_REPORT.md",
        "SESSION_DYNAMIC_PRICING_UPDATE.md",
        "SESSION_WIZARD_ENHANCEMENT_PLAN.md",
        "SESSIONWIZARD_REDESIGN_PROPOSAL.md",
        "SESSIONWIZARD_TESTING_PLAN.md"
    ]
    for f in session_files:
        move_file(f, "02-feature-documentation/session-management")

    matching_files = [
        "MECHANIC_MATCHING_AUDIT.md",
        "MECHANIC_MATCHING_ISSUES_AND_FIXES.md",
        "MECHANIC_SELECTION_IMPLEMENTATION_SUMMARY.md",
        "MECHANIC_SELECTION_COMPLETION_SUMMARY.md",
        "MECHANIC_DASHBOARD_ACCESS_ANALYSIS.md",
        "THREE_TIER_MECHANIC_TESTING_PLAN.md"
    ]
    for f in matching_files:
        move_file(f, "02-feature-documentation/mechanic-matching")

    customer_files = [
        "VEHICLE_ADD_FLOW_ANALYSIS.md",
        "VEHICLE_ADD_IMPLEMENTATION_SUMMARY.md",
        "CONTACT_INFO_PRIVACY_AUDIT.md",
        "SIGNUP_FLOW_AUDIT_REPORT.md"
    ]
    for f in customer_files:
        move_file(f, "02-feature-documentation/customer-portal")

    admin_files = ["ADMIN_PLANS_CRUD_COMPLETE.md"]
    for f in admin_files:
        move_file(f, "02-feature-documentation/admin-panel")

    pricing_files = [
        "DYNAMIC_PRICING_TESTING_GUIDE.md",
        "DYNAMIC_PRICING_IMPLEMENTATION_SUMMARY.md",
        "DYNAMIC_PRICING_COMPLETE_REPORT.md",
        "PLATFORM_FEE_IMPLEMENTATION_COMPLETE.md"
    ]
    for f in pricing_files:
        move_file(f, "02-feature-documentation/pricing-system")

    mechanic_portal_files = ["MECHANIC_REFERRAL_SYSTEM_IMPLEMENTATION.md"]
    for f in mechanic_portal_files:
        move_file(f, "02-feature-documentation/mechanic-portal")

    # Move infrastructure files
    print("\n[7/7] Moving infrastructure and setup files...")

    migration_files = [
        "MIGRATION_SETUP_GUIDE.md",
        "MIGRATION_WORKFLOW_GUIDE.md",
        "MIGRATION_SETUP_COMPLETE.md",
        "MIGRATION_SYNC_SOLUTION.md",
        "MANUAL_SYNC_PROCEDURE.md"
    ]
    for f in migration_files:
        move_file(f, "11-migration-deployment")

    setup_files = ["QUICK_START.md", "DOCKER_SETUP_GUIDE.md"]
    for f in setup_files:
        move_file(f, "01-project-setup")

    testing_files = ["TESTING_GUIDE.md"]
    for f in testing_files:
        move_file(f, "05-testing-debugging")

    troubleshooting_files = ["SUPABASE_CONNECTION_DIAGNOSIS.md"]
    for f in troubleshooting_files:
        move_file(f, "11-migration-deployment/troubleshooting")

    # Move archived files
    archived_files = [
        "RESUME_TOMORROW.md",
        "PARTNERSHIP_SYSTEM_REMOVAL_COMPLETE.md",
        "FINAL_STATUS_AND_RECOMMENDATIONS.md",
        "FINAL_RECOMMENDATION.md"
    ]
    for f in archived_files:
        move_file(f, "13-archived")

    # Print summary
    print("\n" + "=" * 60)
    print("REORGANIZATION COMPLETE")
    print("=" * 60)
    print(f"✓ Files moved: {stats['moved']}")
    print(f"- Files skipped (not found): {stats['skipped']}")
    print(f"✗ Errors: {stats['errors']}")

    # List remaining .md files in root
    remaining = list(ROOT_PATH.glob("*.md"))
    if remaining:
        print(f"\n⚠ Remaining .md files in root ({len(remaining)}):")
        for f in remaining:
            print(f"  - {f.name}")
    else:
        print("\n✓ All .md files moved from root directory!")

if __name__ == "__main__":
    main()
