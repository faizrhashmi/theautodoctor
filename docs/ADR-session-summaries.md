# ADR: Session Findings → Reports → Quotes System

**Date:** 2025-02-04
**Status:** Approved
**Context:** Zero-breakage, always-on unified session summary system

## Decision

### What We're Reusing
1. **sessions.mechanic_notes** - Already exists for video session notes
2. **session_files** - Already stores uploaded media/attachments
3. **diagnostic_sessions** - Has structured diagnosis fields (diagnosis_summary, recommended_services, urgency, photos)
4. **repair_quotes** - Existing quote system
5. **src/lib/urls.ts** - Central URL builders (sessionUrl, dashboardUrl)
6. **src/lib/reports/sessionReport.ts** - PDF generation already exists

### What We're Creating
1. **session_summaries table** - Minimal, unified view linking to existing data
2. **Summary generation** - Extract from chat messages + mechanic_notes
3. **Report page** - /sessions/[id]/report
4. **Prefill helpers** - Wire existing quote/RFQ forms

## Schema Strategy

```sql
CREATE TABLE session_summaries (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  session_type TEXT CHECK (session_type IN ('chat','video')),

  -- Customer-facing summary
  customer_report TEXT,

  -- Structured issues (for prefill)
  identified_issues JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"issue":"Brake pads worn","severity":"high","est_cost_range":"$200-$300"}]

  -- References to existing data (no duplication)
  media_file_ids UUID[] DEFAULT ARRAY[]::UUID[],
  -- Points to session_files.id

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Decision:** Don't duplicate mechanic_notes or files. Store references only.

## API Contract (Additive Only)

- `GET /api/sessions/[id]/summary` - New endpoint
- `POST /api/sessions/[id]/summary` - Create/update summary
- Existing endpoints unchanged

## Notifications

New types:
- `summary_ready` - When summary is generated
- `quote_received` - Already exists
- `rfq_bid_received` - Already exists

## URL Strategy

Use central builders:
```typescript
sessionUrl('chat', id) → '/chat/[id]'
sessionUrl('video', id) → '/video/[id]'
// Add: reportUrl(id) → '/sessions/[id]/report'
```
