# Documentation Standards

**Guidelines for writing and maintaining project documentation**

---

## File Naming Conventions

### General Rules
- Use **UPPERCASE_WITH_UNDERSCORES** for documentation files
- Use **descriptive names** that clearly indicate content
- Add **suffixes** to indicate document type

### Naming Patterns

```bash
# Feature documentation
FEATURE_NAME_IMPLEMENTATION.md
FEATURE_NAME_SETUP.md
FEATURE_NAME_GUIDE.md

# Bug fixes
BUG_NAME_FIX.md
BUG_NAME_FIX_SUMMARY.md

# Progress reports
PHASE_N_COMPLETE.md
FEATURE_NAME_COMPLETION_REPORT.md

# Audits and analysis
FEATURE_NAME_AUDIT.md
FEATURE_NAME_ANALYSIS.md

# Guides and tutorials
FEATURE_NAME_SETUP_GUIDE.md
FEATURE_NAME_TESTING_GUIDE.md
```

### Examples
✅ **Good:**
- `CUSTOMER_AUTH_SETUP.md`
- `STRIPE_WEBHOOK_SETUP.md`
- `SESSION_EXPIRATION_FIX.md`
- `AUDIT_REPORT.md`

❌ **Avoid:**
- `setup.md` (too vague)
- `fix1.md` (not descriptive)
- `temp-notes.md` (not permanent)
- `customer_auth.md` (missing suffix/context)

---

## Document Structure

### Required Sections

Every documentation file should include:

```markdown
# Document Title

**Brief subtitle or description**

---

## Overview
Brief introduction (2-3 sentences) explaining what this document covers.

## [Main Content Sections]
The core content organized into logical sections.

---

**Last Updated**: [Date]
**Status**: [Complete/In Progress/Deprecated]
**Related Documents**: [Links to related docs]
```

### Optional Sections (as needed)

```markdown
## Prerequisites
What you need before starting

## Quick Start
TL;DR version for experienced users

## Detailed Instructions
Step-by-step guide

## Troubleshooting
Common issues and solutions

## FAQs
Frequently asked questions

## Examples
Code examples and use cases

## Next Steps
What to do after completing this guide

## References
External links and resources
```

---

## Writing Style

### Voice and Tone
- ✅ **Clear and concise** - Get to the point quickly
- ✅ **Professional but friendly** - Conversational tone
- ✅ **Active voice** - "Click the button" not "The button should be clicked"
- ✅ **Present tense** - "The system creates..." not "The system will create..."

### Language Guidelines

**✅ DO:**
```markdown
## Setting Up Authentication

To set up authentication:
1. Install the required packages
2. Configure your environment variables
3. Run the setup script

This creates a secure authentication system.
```

**❌ DON'T:**
```markdown
## auth setup

you should probably install some packages and then maybe configure
environment variables if you want. then the setup script can be run
and it might create an auth system.
```

---

## Formatting Standards

### Headings

```markdown
# H1 - Document Title (only one per document)

## H2 - Main Sections

### H3 - Subsections

#### H4 - Sub-subsections (use sparingly)
```

**Rules:**
- Only one H1 per document (the title)
- Don't skip heading levels (H2 → H4)
- Use sentence case for headings
- Keep headings concise (under 60 characters)

### Code Blocks

Always specify the language for syntax highlighting:

```markdown
\`\`\`typescript
// TypeScript code
const user = { name: "John" };
\`\`\`

\`\`\`bash
# Bash commands
npm install
\`\`\`

\`\`\`sql
-- SQL queries
SELECT * FROM users;
\`\`\`
```

### Lists

**Unordered Lists:**
```markdown
- First item
- Second item
  - Nested item
  - Another nested item
- Third item
```

**Ordered Lists:**
```markdown
1. First step
2. Second step
3. Third step
```

**Task Lists:**
```markdown
- [x] Completed task
- [ ] Incomplete task
- [ ] Another task
```

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

**Alignment:**
```markdown
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
```

### Links

**Internal Links (relative paths):**
```markdown
[Link text](../../02-feature-documentation/chat-system/CHAT_V2_SETUP.md)
```

**External Links:**
```markdown
[Next.js Documentation](https://nextjs.org/docs)
```

**Reference Links:**
```markdown
See the [Security Audit][1] for details.

[1]: ../04-security/audit-reports/AUDIT_REPORT.md
```

### Images

```markdown
![Alt text for accessibility](path/to/image.png)

<!-- With caption -->
![User dashboard screenshot](./images/dashboard.png)
*Figure 1: User dashboard showing session list*
```

---

## Code Examples

### Command Line Examples

```markdown
### Installation

\`\`\`bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
\`\`\`
```

**Guidelines:**
- Add comments explaining each command
- Show expected output when helpful
- Include error handling examples
- Use realistic example data

### Code Snippets

```markdown
### Creating a Session

\`\`\`typescript
// components/SessionCreator.tsx
import { createSession } from '@/lib/sessions';

export function SessionCreator() {
  const handleCreate = async () => {
    const session = await createSession({
      customerId: user.id,
      type: 'quick_chat'
    });

    console.log('Session created:', session.id);
  };

  return <button onClick={handleCreate}>Start Session</button>;
}
\`\`\`
```

**Guidelines:**
- Include file paths in comments
- Show imports
- Add inline comments for complex logic
- Keep examples focused and minimal

---

## Special Elements

### Callouts and Notices

```markdown
> **Note:** This is a general note providing additional context.

> ⚠️ **Warning:** This action cannot be undone.

> ✅ **Tip:** You can speed this up by using the shortcut.

> 🔒 **Security:** Never commit credentials to version control.

> 📌 **Important:** Read this before proceeding.

> ⚡ **Breaking Change:** This will break existing implementations.
```

### Status Badges

```markdown
**Status**: ✅ Complete | 🔄 In Progress | ⚠️ Deprecated | 🚧 Under Construction
```

### Dates and Versions

Always include dates and versions:

```markdown
**Last Updated**: 2025-11-07
**Version**: 2.5.0
**Applies To**: v2.4.0 and later
```

### Collapsible Sections

For optional or advanced content:

```markdown
<details>
<summary>Advanced Configuration (click to expand)</summary>

### Advanced Options

You can configure additional settings...

</details>
```

---

## Documentation Types

### Setup Guides

**Purpose**: Help users configure a feature or system

**Structure:**
```markdown
# Feature Setup Guide

**Quick setup guide for [Feature Name]**

## Prerequisites
- Requirement 1
- Requirement 2

## Setup Steps

### Step 1: [First Step]
Instructions...

### Step 2: [Second Step]
Instructions...

## Verification
How to verify setup worked

## Troubleshooting
Common issues and solutions

## Next Steps
What to do after setup
```

### Implementation Summaries

**Purpose**: Document a completed implementation

**Structure:**
```markdown
# Feature Implementation Summary

**Summary of [Feature Name] implementation**

## Overview
What was implemented and why

## What Changed
- Change 1
- Change 2
- Change 3

## Implementation Details

### Frontend Changes
Description...

### Backend Changes
Description...

### Database Changes
Description...

## Testing
How to test the implementation

## Migration Notes
Steps needed for existing installations

## Related Documents
- [Link to setup guide]
- [Link to API docs]
```

### Bug Fix Documentation

**Purpose**: Document a bug and its solution

**Structure:**
```markdown
# Bug Name Fix

**Fix for [specific bug description]**

## Problem
Description of the bug and its symptoms

## Root Cause
What caused the bug

## Solution
How the bug was fixed

## Changes Made
- File 1: Change description
- File 2: Change description

## Testing
How to verify the fix

## Prevention
How to avoid this bug in the future

## Related Issues
Links to related bugs or discussions
```

### Audit Reports

**Purpose**: Document findings from code/security audits

**Structure:**
```markdown
# Audit Report: [Area]

**Comprehensive audit of [system/feature]**

## Executive Summary
High-level findings

## Scope
What was audited

## Findings

### Critical Issues
- Issue 1
- Issue 2

### Medium Priority
- Issue 3
- Issue 4

### Low Priority / Recommendations
- Item 1
- Item 2

## Recommendations
Suggested improvements

## Action Items
- [ ] Task 1
- [ ] Task 2

## Conclusion
Overall assessment
```

---

## Cross-Referencing

### Linking to Other Docs

**Always use relative paths:**
```markdown
See [Customer Authentication Setup](../../02-feature-documentation/customer-portal/CUSTOMER_AUTH_SETUP.md) for details.
```

**Related Documents Section:**
```markdown
## Related Documents

- [Stripe Webhook Setup](../../03-integration/payment-processing/STRIPE_WEBHOOK_SETUP.md)
- [Security Audit](../../04-security/audit-reports/AUDIT_REPORT.md)
- [Testing Guide](../../05-testing-debugging/test-configuration/TESTING_GUIDE.md)
```

### Version References

```markdown
## Compatibility

This guide applies to:
- ✅ v2.5.0 and later
- ⚠️ v2.4.0 (with modifications)
- ❌ v2.3.x and earlier (see [Legacy Guide](./LEGACY_SETUP.md))
```

---

## Maintenance

### Keeping Docs Updated

**When to update:**
- ✅ Code changes affect documented behavior
- ✅ New features added
- ✅ Bugs fixed that were documented
- ✅ Dependencies updated
- ✅ Best practices change
- ✅ Security vulnerabilities found

**Update checklist:**
- [ ] Content is accurate
- [ ] Code examples work
- [ ] Links aren't broken
- [ ] Dates updated
- [ ] Related docs updated
- [ ] Screenshots current (if applicable)

### Deprecating Documentation

When documentation becomes outdated:

```markdown
# ⚠️ DEPRECATED: Old Feature Name

**This document is deprecated as of 2025-11-07**

This feature has been replaced by [New Feature](../new-feature/SETUP.md).

## Migration Guide
See [Migration from Old to New](../migration/OLD_TO_NEW.md).

---

## Legacy Documentation

*The following documentation is kept for reference only.*

[Original content...]
```

### Archiving Old Docs

Move deprecated docs to an archive folder:

```bash
documentation/archive/deprecated-2025/
```

---

## Quality Checklist

Before submitting documentation:

- [ ] **Clarity**: Can someone unfamiliar with the topic understand it?
- [ ] **Completeness**: Does it cover all necessary information?
- [ ] **Accuracy**: Is all information correct and current?
- [ ] **Examples**: Are there practical, working examples?
- [ ] **Formatting**: Proper markdown formatting?
- [ ] **Links**: All links work and use relative paths?
- [ ] **Grammar**: No spelling or grammar errors?
- [ ] **Structure**: Follows the standard structure?
- [ ] **Metadata**: Includes dates, status, related docs?
- [ ] **Testing**: Code examples tested and working?

---

## Tools and Resources

### Markdown Editors
- VS Code with Markdown Preview
- Typora
- MarkText

### Linters
```bash
# Install markdownlint
npm install -g markdownlint-cli

# Lint your docs
markdownlint documentation/**/*.md
```

### Preview Tools
- VS Code: `Ctrl+Shift+V` (Windows) or `Cmd+Shift+V` (Mac)
- GitHub: Automatic rendering in PRs

### Templates

Use these templates as starting points:
- [HOW_TO_UPDATE_README.md](./HOW_TO_UPDATE_README.md)
- [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## Examples

### Good Documentation Example

```markdown
# Stripe Webhook Setup

**Configure Stripe webhooks for local development**

---

## Overview

This guide shows you how to set up Stripe webhook forwarding for local development,
allowing you to test payment events without deploying to production.

## Prerequisites

- Stripe account with API access
- Stripe CLI installed
- Project running locally on port 3000

## Setup Steps

### Step 1: Install Stripe CLI

\`\`\`bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
# See https://stripe.com/docs/stripe-cli
\`\`\`

### Step 2: Login to Stripe

\`\`\`bash
stripe login
\`\`\`

This opens your browser to authorize the CLI.

### Step 3: Forward Webhooks

\`\`\`bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
\`\`\`

### Step 4: Copy Webhook Secret

The CLI outputs a webhook signing secret:

\`\`\`
> Ready! Your webhook signing secret is whsec_abc123...
\`\`\`

Add this to your `.env.local`:

\`\`\`bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
\`\`\`

## Verification

Test that webhooks are working:

\`\`\`bash
stripe trigger payment_intent.succeeded
\`\`\`

Check your terminal for the webhook event.

## Troubleshooting

**Issue**: `stripe: command not found`
- **Solution**: Make sure Stripe CLI is installed and in your PATH

**Issue**: Webhooks not received
- **Solution**: Check that your local server is running on the correct port

## Next Steps

- [Configure production webhooks](./PRODUCTION_WEBHOOK_SETUP.md)
- [Handle webhook events](./WEBHOOK_EVENT_HANDLING.md)

---

**Last Updated**: 2025-11-07
**Status**: ✅ Complete
**Related Documents**:
- [Stripe Connect Implementation](./STRIPE_CONNECT_IMPLEMENTATION.md)
- [Payment Processing Guide](./PAYMENT_PROCESSING.md)
\`\`\`
```

---

**Last Updated**: November 7, 2025
**Maintained By**: Development Team
