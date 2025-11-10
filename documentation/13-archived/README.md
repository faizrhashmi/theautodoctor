# 13-archived

**Purpose:** Superseded documentation, old versions, deprecated features, and historical records

---

## Overview

This folder contains documentation that is no longer current but preserved for historical reference. Documents are archived when:

1. **Superseded by newer versions** - A more comprehensive or updated document exists
2. **Feature removed** - Feature has been deprecated or removed from the platform
3. **Outdated information** - Content is no longer accurate or relevant
4. **Consolidated elsewhere** - Information merged into other documents

---

## Contents

### Archived Documents

#### RESUME_TOMORROW.md
- **Archived:** 2025-11-09
- **Reason:** Old task list from previous development session
- **Status:** Completed/No longer relevant
- **Superseded By:** Current project board and task tracking

#### PARTNERSHIP_SYSTEM_REMOVAL_COMPLETE.md
- **Archived:** 2025-11-09
- **Reason:** Documents removal of deprecated partnership feature
- **Status:** Feature removed
- **Historical Value:** Shows why partnership system was removed

#### FINAL_STATUS_AND_RECOMMENDATIONS.md
- **Archived:** 2025-11-09
- **Reason:** Superseded by more recent comprehensive reports
- **Superseded By:**
  - documentation/00-summaries-analysis/BUSINESS_LOGIC_FINAL_REPORT.md
  - documentation/00-summaries-analysis/CODEBASE_AUDIT_REPORT.md

#### FINAL_RECOMMENDATION.md
- **Archived:** 2025-11-09
- **Reason:** Older recommendation document superseded by newer reports
- **Superseded By:**
  - documentation/00-summaries-analysis/AUDIT_CLAIMS_FINAL_VERDICT.md
  - documentation/08-business-strategy/progress-reports/PHASE4_COMPLETE.md

---

## Archive Policy

### When to Archive Documents

#### Superseded Documents
Archive when:
- A newer version with the same purpose exists
- Multiple versions of the same document exist (keep only latest)
- Content has been consolidated into a comprehensive report
- Information is covered more thoroughly elsewhere

**Example:** Keep only the latest audit report, archive older versions

#### Deprecated Features
Archive when:
- Feature has been removed from the platform
- Feature was planned but cancelled
- Alternative implementation chosen

**Example:** Partnership system was removed, document archived

#### Outdated Information
Archive when:
- Technical details no longer match current implementation
- Business model has changed significantly
- Policies have been updated
- Data is obsolete

**Example:** Old pricing models when pricing structure changed

#### Task Lists & Progress Reports
Archive when:
- Tasks are completed
- Project phase is finished
- New project board tracking exists

**Example:** Daily task lists from completed sprints

---

## How to Archive a Document

### Step 1: Identify Document for Archiving
- Check if superseded by newer doc
- Verify information is outdated
- Confirm feature is deprecated

### Step 2: Determine Archive Location
```
13-archived/
├── by-category/
│   ├── features/          # Deprecated features
│   ├── reports/           # Old reports/audits
│   ├── policies/          # Outdated policies
│   └── progress/          # Completed task lists
└── by-date/
    ├── 2025-10/           # October 2025 archives
    └── 2025-11/           # November 2025 archives
```

### Step 3: Update Document Header
Add archive notice to the top:
```markdown
> **ARCHIVED:** 2025-11-09
> **Reason:** Superseded by [New Document](../path/to/new.md)
> **Historical Value:** [Why this is preserved]
```

### Step 4: Update Related Documentation
- Remove links to archived doc from active docs
- Update INDEX.md
- Add redirect/reference to newer doc

### Step 5: Move to Archive
```bash
mv document.md documentation/13-archived/by-category/[category]/
```

---

## Organizing Archived Documents

### By Category
Organize similar archived documents together:

```
13-archived/
├── features/
│   ├── PARTNERSHIP_SYSTEM_REMOVAL_COMPLETE.md
│   └── [other deprecated features]
├── reports/
│   ├── FINAL_STATUS_AND_RECOMMENDATIONS.md
│   ├── FINAL_RECOMMENDATION.md
│   └── [older audit versions]
├── policies/
│   └── [outdated policy documents]
├── progress/
│   ├── RESUME_TOMORROW.md
│   └── [old task lists]
└── implementations/
    └── [cancelled implementation plans]
```

### By Date
Alternatively, organize by archive date:

```
13-archived/
├── 2025-10/
│   └── [October archives]
└── 2025-11/
    ├── RESUME_TOMORROW.md
    ├── PARTNERSHIP_SYSTEM_REMOVAL_COMPLETE.md
    ├── FINAL_STATUS_AND_RECOMMENDATIONS.md
    └── FINAL_RECOMMENDATION.md
```

---

## Using Archived Documents

### When to Reference Archives

#### Historical Context
- Understanding why features were removed
- Learning from past decisions
- Tracking project evolution

#### Legal/Audit Purposes
- Documenting what was implemented when
- Showing policy evolution
- Compliance audits

#### Onboarding
- Understanding platform history
- Learning from past mistakes
- Seeing feature evolution

### When NOT to Use Archives

- **Don't cite as current** - Archives are outdated
- **Don't copy-paste code** - May not work with current version
- **Don't follow old procedures** - Use current documentation

---

## Archive Maintenance

### Quarterly Review
Every 3 months:
1. Review archived documents
2. Determine if still needed
3. Consider permanent deletion if:
   - No historical value
   - No legal requirement to keep
   - Not referenced anywhere
   - >2 years old with no relevance

### Annual Cleanup
Annually:
1. Compress very old archives (>2 years)
2. Move to long-term storage if needed
3. Update archive index
4. Remove truly obsolete documents

---

## Current Active Alternatives

### Instead of Archived Docs, Use:

#### For Status & Recommendations:
- [00-summaries-analysis/BUSINESS_LOGIC_FINAL_REPORT.md](../00-summaries-analysis/BUSINESS_LOGIC_FINAL_REPORT.md)
- [00-summaries-analysis/AUDIT_CLAIMS_FINAL_VERDICT.md](../00-summaries-analysis/AUDIT_CLAIMS_FINAL_VERDICT.md)

#### For Progress Tracking:
- [08-business-strategy/progress-reports/](../08-business-strategy/progress-reports/)
- Current project board/task tracking system

#### For Implementation Plans:
- [08-business-strategy/feature-roadmap/](../08-business-strategy/feature-roadmap/)
- [02-feature-documentation/](../02-feature-documentation/)

#### For Technical Audits:
- [00-summaries-analysis/CODEBASE_AUDIT_REPORT.md](../00-summaries-analysis/CODEBASE_AUDIT_REPORT.md)
- [04-security/audit-reports/](../04-security/audit-reports/)

---

## Related Documentation

- **Main Index:** [documentation/INDEX.md](../INDEX.md)
- **Summaries:** [00-summaries-analysis/](../00-summaries-analysis/)
- **Progress Reports:** [08-business-strategy/progress-reports/](../08-business-strategy/progress-reports/)

---

**Archive Policy Effective:** 2025-11-09
**Maintained By:** Documentation Team
**Review Frequency:** Quarterly
