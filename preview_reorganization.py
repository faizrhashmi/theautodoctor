#!/usr/bin/env python3
"""
Preview Documentation Reorganization
Shows what files will be moved where without actually moving them
"""

import os
from pathlib import Path
from collections import defaultdict

# Base paths
ROOT_PATH = Path("c:/Users/Faiz Hashmi/theautodoctor")
DOC_PATH = ROOT_PATH / "documentation"

# File mapping
file_mapping = {
    "00-summaries-analysis": [
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
    ],
    "12-legal-compliance": [
        "CUSTOMER_OWNERSHIP_LEGAL_ANALYSIS.md",
        "LEGAL_COMPLIANT_DUAL_MODE_SOLUTION.md",
        "WORKSHOP_MECHANICS_EXECUTIVE_REPORT.md",
        "VIRTUAL_VS_WORKSHOP_MECHANICS_POLICY.md",
        "WORKSHOP_MECHANIC_BUSINESS_MODEL.md",
        "ACCOUNT_SEPARATION_EXPLANATION.md"
    ],
    "08-business-strategy/progress-reports": [
        "IMPLEMENTATION_PROGRESS.md",
        "IMPLEMENTATION_STATUS_AND_NEXT_STEPS.md",
        "PHASE1_COMPLETE_NEXT_STEPS.md",
        "PHASE4_ANALYSIS_REPORT.md",
        "PHASE4_COMPLETE.md"
    ],
    "08-business-strategy/feature-roadmap": [
        "FINAL_IMPLEMENTATION_PLAN.md",
        "IMMEDIATE_ACTION_PLAN.md",
        "FINAL_SEAMLESS_INTEGRATION_PLAN.md",
        "WORKSHOP_IMPLEMENTATION_PLAN.md",
        "SMART_WORKSHOP_SOLUTION.md",
        "TRUST_BASED_WORKSHOP_SOLUTION.md",
        "FINAL_REALISTIC_WORKSHOP_SOLUTION.md",
        "ULTIMATE_MECHANIC_SELECTION_PLAN.md"
    ],
    "06-bug-fixes": [
        "CRITICAL_BUGS_FOUND.md",
        "BUGS_FIXED.md",
        "COMPLETION_MODAL_FIX.md",
        "VIDEO_SESSION_MECHANIC_NAME_BUG.md",
        "VIDEO_SESSION_MECHANIC_NAME_FIX_APPLIED.md",
        "TAGS_PANEL_MOBILE_UPDATE.md",
        "PRIVACY_FIXES_IMPLEMENTED.md"
    ],
    "02-feature-documentation/inspection-controls": [
        "PROFESSIONAL_INSPECTION_CONTROLS_PLAN.md",
        "PROFESSIONAL_INSPECTION_CONTROLS_IMPLEMENTATION.md",
        "INSPECTION_CONTROLS_BUGS_FIXED.md",
        "INSPECTION_CONTROLS_ANALYSIS_AND_RECOMMENDATIONS.md",
        "INSPECTION_CONTROLS_IMPLEMENTATION_REPORT.md",
        "INSPECTION_CONTROLS_COMPREHENSIVE_UPDATE.md"
    ],
    "02-feature-documentation/session-management": [
        "SESSION_END_LOGIC_INSPECTION_SUMMARY.md",
        "SESSION_END_LOGIC_VERIFICATION_REPORT.md",
        "SESSION_EXECUTION_ACTUAL_STATE_REPORT.md",
        "SESSION_DYNAMIC_PRICING_UPDATE.md",
        "SESSION_WIZARD_ENHANCEMENT_PLAN.md",
        "SESSIONWIZARD_REDESIGN_PROPOSAL.md",
        "SESSIONWIZARD_TESTING_PLAN.md"
    ],
    "02-feature-documentation/mechanic-matching": [
        "MECHANIC_MATCHING_AUDIT.md",
        "MECHANIC_MATCHING_ISSUES_AND_FIXES.md",
        "MECHANIC_SELECTION_IMPLEMENTATION_SUMMARY.md",
        "MECHANIC_SELECTION_COMPLETION_SUMMARY.md",
        "MECHANIC_DASHBOARD_ACCESS_ANALYSIS.md",
        "THREE_TIER_MECHANIC_TESTING_PLAN.md"
    ],
    "02-feature-documentation/customer-portal": [
        "VEHICLE_ADD_FLOW_ANALYSIS.md",
        "VEHICLE_ADD_IMPLEMENTATION_SUMMARY.md",
        "CONTACT_INFO_PRIVACY_AUDIT.md",
        "SIGNUP_FLOW_AUDIT_REPORT.md"
    ],
    "02-feature-documentation/admin-panel": [
        "ADMIN_PLANS_CRUD_COMPLETE.md"
    ],
    "02-feature-documentation/pricing-system": [
        "DYNAMIC_PRICING_TESTING_GUIDE.md",
        "DYNAMIC_PRICING_IMPLEMENTATION_SUMMARY.md",
        "DYNAMIC_PRICING_COMPLETE_REPORT.md",
        "PLATFORM_FEE_IMPLEMENTATION_COMPLETE.md"
    ],
    "02-feature-documentation/mechanic-portal": [
        "MECHANIC_REFERRAL_SYSTEM_IMPLEMENTATION.md"
    ],
    "11-migration-deployment": [
        "MIGRATION_SETUP_GUIDE.md",
        "MIGRATION_WORKFLOW_GUIDE.md",
        "MIGRATION_SETUP_COMPLETE.md",
        "MIGRATION_SYNC_SOLUTION.md",
        "MANUAL_SYNC_PROCEDURE.md"
    ],
    "01-project-setup": [
        "QUICK_START.md",
        "DOCKER_SETUP_GUIDE.md"
    ],
    "05-testing-debugging": [
        "TESTING_GUIDE.md"
    ],
    "11-migration-deployment/troubleshooting": [
        "SUPABASE_CONNECTION_DIAGNOSIS.md"
    ],
    "13-archived": [
        "RESUME_TOMORROW.md",
        "PARTNERSHIP_SYSTEM_REMOVAL_COMPLETE.md",
        "FINAL_STATUS_AND_RECOMMENDATIONS.md",
        "FINAL_RECOMMENDATION.md"
    ]
}

def main():
    print("=" * 80)
    print("DOCUMENTATION REORGANIZATION PREVIEW")
    print("=" * 80)
    print("\nThis script shows what WILL happen (without actually moving files)")
    print()

    # Check which files exist
    total_files = 0
    found_files = 0
    missing_files = 0

    category_stats = defaultdict(lambda: {"found": 0, "missing": 0})

    for category, files in file_mapping.items():
        total_files += len(files)
        for filename in files:
            source = ROOT_PATH / filename
            if source.exists():
                found_files += 1
                category_stats[category]["found"] += 1
            else:
                missing_files += 1
                category_stats[category]["missing"] += 1

    # Print summary
    print(f"Total files in plan: {total_files}")
    print(f"  ✓ Found in root: {found_files}")
    print(f"  ✗ Not found: {missing_files}")
    print()

    # Print by category
    print("-" * 80)
    print("FILE MOVEMENTS BY CATEGORY")
    print("-" * 80)
    print()

    for category in sorted(file_mapping.keys()):
        files = file_mapping[category]
        stats = category_stats[category]

        print(f"📁 {category}/")
        print(f"   Files to move: {len(files)} ({stats['found']} found, {stats['missing']} missing)")
        print()

        for filename in sorted(files):
            source = ROOT_PATH / filename
            destination = DOC_PATH / category / filename

            if source.exists():
                size = source.stat().st_size
                size_kb = size / 1024
                print(f"   ✓ {filename} ({size_kb:.1f} KB)")
            else:
                print(f"   ✗ {filename} (NOT FOUND)")

        print()

    # Check for .md files not in the plan
    print("-" * 80)
    print("FILES NOT IN REORGANIZATION PLAN")
    print("-" * 80)
    print()

    all_planned_files = set()
    for files in file_mapping.values():
        all_planned_files.update(files)

    unplanned_files = []
    for md_file in ROOT_PATH.glob("*.md"):
        if md_file.name not in all_planned_files:
            unplanned_files.append(md_file.name)

    if unplanned_files:
        print(f"Found {len(unplanned_files)} unplanned .md files in root:")
        print()
        for filename in sorted(unplanned_files):
            filepath = ROOT_PATH / filename
            size = filepath.stat().st_size
            size_kb = size / 1024
            print(f"   ⚠ {filename} ({size_kb:.1f} KB)")
        print()
        print("These files are in root but not in the reorganization plan.")
        print("Review and add to reorganize_docs.py if needed.")
    else:
        print("✓ All .md files in root are accounted for in the plan!")

    print()

    # New folders to be created
    print("-" * 80)
    print("NEW FOLDERS TO BE CREATED")
    print("-" * 80)
    print()

    new_folders = [
        "documentation/00-summaries-analysis",
        "documentation/12-legal-compliance",
        "documentation/13-archived",
        "documentation/02-feature-documentation/inspection-controls",
        "documentation/02-feature-documentation/mechanic-matching",
        "documentation/02-feature-documentation/pricing-system",
        "documentation/11-migration-deployment/troubleshooting"
    ]

    for folder in new_folders:
        path = Path(folder)
        if path.exists():
            print(f"   ✓ {folder} (already exists)")
        else:
            print(f"   + {folder} (will be created)")

    print()

    # Final summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    print(f"Total planned moves: {total_files}")
    print(f"Files ready to move: {found_files}")
    print(f"Files not found: {missing_files}")
    print(f"Unplanned files in root: {len(unplanned_files)}")
    print()

    if found_files > 0:
        print("✓ Ready to run reorganization script!")
        print()
        print("To execute:")
        print("  python reorganize_docs.py")
        print("  OR")
        print("  powershell -ExecutionPolicy Bypass -File reorganize_docs.ps1")
    else:
        print("✗ No files found to reorganize. They may have already been moved.")

    print()
    print("=" * 80)

if __name__ == "__main__":
    main()
