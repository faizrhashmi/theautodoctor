# AutoDoctor Investor Briefing

**Prepared for:** Prospective investors

**Date:** 2025-11-02

---

## 1. Product Snapshot

- Multi-sided marketplace connecting vehicle owners, independent mechanics, and workshop teams, presented through a conversion-oriented landing page that highlights a limited-time free trial alongside three paid tiers (`free`, `Quick Chat`, `Video Diagnostic`, `Complete Guidance`) [src/app/page.tsx:7](src/app/page.tsx:7), [src/lib/pricing.ts:3](src/lib/pricing.ts:3).
- Differentiated value stack covering timer-controlled HD video bays, secure asset sharing, and support tooling that is consistent across marketing and pricing surfaces [src/lib/pricing.ts:34](src/lib/pricing.ts:34), [src/components/session/SessionTimer.tsx:10](src/components/session/SessionTimer.tsx:10), [src/components/chat/FloatingChatPopup.tsx:18](src/components/chat/FloatingChatPopup.tsx:18).
- Unified platform: Next.js 14 front end, Supabase for authentication/RLS-protected data, LiveKit for real-time sessions, Stripe for payments/payouts, and CRM automations for lifecycle tracking [package.json:20](package.json:20), [src/lib/auth/guards.ts:76](src/lib/auth/guards.ts:76), [src/app/diagnostic/[id]/VideoSessionClient.tsx:1](src/app/diagnostic/[id]/VideoSessionClient.tsx:1), [src/app/api/sessions/resolve-by-stripe/route.ts:1](src/app/api/sessions/resolve-by-stripe/route.ts:1), [src/lib/crm.ts:28](src/lib/crm.ts:28).

---

## 2. Market Fit & Value Proposition

- Tackles the high-friction process of diagnosing vehicle issues by offering instant expert access without trips to a shop; the homepage banner promises immediate free trials and transparent tiered pricing, lowering adoption risk for first-time users [src/app/page.tsx:17](src/app/page.tsx:17).
- Customers can escalate from text triage to immersive diagnostics and obtain actionable summaries, aligning with the need for remote-first yet trustworthy automotive guidance [src/app/diagnostic/[id]/VideoSessionClient.tsx:1067](src/app/diagnostic/[id]/VideoSessionClient.tsx:1067), [src/app/api/sessions/[id]/summary/route.ts:55](src/app/api/sessions/[id]/summary/route.ts:55).
- Mechanics gain flexible work, on-shift controls, and a queue of curated requests, addressing skilled labour underutilisation [src/app/mechanic/dashboard/page.tsx:495](src/app/mechanic/dashboard/page.tsx:495), while workshops receive a dashboard for staffing, coverage planning, and invite management [src/app/workshop/dashboard/page.tsx:18](src/app/workshop/dashboard/page.tsx:18).

---

## 3. Customer Journey (Current Build)

1. **Discovery & Activation** – Visitors move from the landing page into pricing with consistent plan messaging and value proofs [src/app/services-pricing/page.tsx:5](src/app/services-pricing/page.tsx:5), [src/lib/pricing.ts:3](src/lib/pricing.ts:3). A floating support bubble with scheduled availability signals human backup [src/components/chat/ChatBubble.tsx:18](src/components/chat/ChatBubble.tsx:18), [src/components/chat/FloatingChatPopup.tsx:156](src/components/chat/FloatingChatPopup.tsx:156).
2. **Intake** – Authenticated customers complete a guided form that validates VINs, captures urgency, supports saved vehicles, and uploads media while enforcing location/contact requirements [src/app/intake/page.tsx:35](src/app/intake/page.tsx:35), [src/app/intake/page.tsx:114](src/app/intake/page.tsx:114). Preferred mechanic routing and urgent overrides are already wired for phased rollouts [src/app/intake/page.tsx:61](src/app/intake/page.tsx:61), [src/app/api/intake/start/route.ts:175](src/app/api/intake/start/route.ts:175).
3. **Session Creation** – The intake API records CRM events, enforces one-active-session logic, supports credit redemptions, and seeds Supabase-stored session rows [src/app/api/intake/start/route.ts:97](src/app/api/intake/start/route.ts:97), [src/app/api/intake/start/route.ts:114](src/app/api/intake/start/route.ts:114), [src/app/api/intake/start/route.ts:145](src/app/api/intake/start/route.ts:145).
4. **Payment & Fulfilment** – Paid flows rely on Stripe Checkout with webhook-equivalent fallback via `/api/sessions/resolve-by-stripe`, before handing off to a fulfilment pipeline that broadcasts requests in real time and respects preferred mechanic priority windows [src/app/api/sessions/resolve-by-stripe/route.ts:1](src/app/api/sessions/resolve-by-stripe/route.ts:1), [src/lib/fulfillment.ts:410](src/lib/fulfillment.ts:410).
5. **Live Session Delivery** – LiveKit rooms render connection diagnostics, device preflight, branded controls, secure chat, timer overlays, and paid time-extension offers [src/app/diagnostic/[id]/VideoSessionClient.tsx:21](src/app/diagnostic/[id]/VideoSessionClient.tsx:21), [src/app/diagnostic/[id]/VideoSessionClient.tsx:53](src/app/diagnostic/[id]/VideoSessionClient.tsx:53), [src/app/diagnostic/[id]/VideoSessionClient.tsx:31](src/app/diagnostic/[id]/VideoSessionClient.tsx:31).
6. **Post-Session Follow-up** – Mechanics submit structured findings with media uploads, triggering branded email delivery and signed storage URLs for customers [src/app/api/sessions/[id]/summary/route.ts:33](src/app/api/sessions/[id]/summary/route.ts:33), [src/app/api/sessions/[id]/summary/route.ts:101](src/app/api/sessions/[id]/summary/route.ts:101).
7. **Retention** – CRM utilities log behaviour, manufacture upsell recommendations (maintenance plans, follow-up diagnostics), and expose funnel metrics for experimentation [src/lib/crm.ts:74](src/lib/crm.ts:74), [src/lib/crm.ts:295](src/lib/crm.ts:295), [src/lib/crm.ts:331](src/lib/crm.ts:331).

---

## 4. Mechanic & Workshop Ecosystem

- **Mechanic Onboarding** – Six-step application with credential capture, file uploads, and insurance checks positions the network as premium-only [src/app/mechanic/signup/page.tsx:1](src/app/mechanic/signup/page.tsx:1).
- **Operations Dashboard** – Auth-guarded dashboard surfaces on-shift toggles, live request queues, stats, and real-time session monitoring, all backed by Supabase subscriptions [src/app/mechanic/dashboard/page.tsx:66](src/app/mechanic/dashboard/page.tsx:66), [src/app/mechanic/dashboard/page.tsx:495](src/app/mechanic/dashboard/page.tsx:495), [src/components/mechanic/MechanicActiveSessionsManager.tsx:27](src/components/mechanic/MechanicActiveSessionsManager.tsx:27).
- **Workshop Enablement** – Dedicated portal summarises coverage geography, mechanic capacity, Stripe account readiness, and invite pipelines, with modal-driven invite flows producing shareable codes [src/app/workshop/dashboard/page.tsx:18](src/app/workshop/dashboard/page.tsx:18), [src/components/workshop/InviteMechanicModal.tsx:31](src/components/workshop/InviteMechanicModal.tsx:31).

---

## 5. Monetisation Engine

- Tiered pricing anchored to Stripe price IDs and mapped to fulfilment types (`chat`, `video`, `diagnostic`) for consistent downstream handling [src/config/pricing.ts:41](src/config/pricing.ts:41).
- Complimentary & credit-based sessions share the same waiver-first experience and single-active-session guardrails, supporting upsell funnels without compromising supply [src/app/api/intake/start/route.ts:205](src/app/api/intake/start/route.ts:205).
- Time-extension offers and upgrade pathways are surfaced in-session, creating incremental revenue moments without requiring new checkout flows [src/app/diagnostic/[id]/VideoSessionClient.tsx:31](src/app/diagnostic/[id]/VideoSessionClient.tsx:31), [src/app/api/sessions/[id]/upgrade/route.ts:6](src/app/api/sessions/[id]/upgrade/route.ts:6).
- CRM-driven upsells recommend follow-up sessions and maintenance plans based on session traits, positioning recurring revenue [src/lib/crm.ts:275](src/lib/crm.ts:275).

---

## 6. Platform Infrastructure

- **Authentication & Access Control** – Central guard utilities enforce role checks, redirect logic, and workshop membership validation, backed by Supabase row-level security policies [src/lib/auth/guards.ts:76](src/lib/auth/guards.ts:76), [tests/e2e/rls-policies.spec.ts:1](tests/e2e/rls-policies.spec.ts:1).
- **Realtime Orchestration** – Persistent Supabase broadcast channels fan out session requests, with fallback timers to avoid stranded customers [src/lib/realtimeChannels.ts:1](src/lib/realtimeChannels.ts:1), [src/lib/fulfillment.ts:548](src/lib/fulfillment.ts:548).
- **Tooling & Observability** – Playwright suites cover database integrity/RLS regressions, while analytics utilities log workshop milestones [tests/e2e/database-integrity.spec.ts:1](tests/e2e/database-integrity.spec.ts:1), [src/lib/analytics/workshopEvents.ts:1](src/lib/analytics/workshopEvents.ts:1).

---

## 7. Safety, Compliance & Trust

- Mandatory waiver modal with scroll-to-accept gating and liability disclaimers reduces legal exposure before any session begins [src/components/customer/WaiverModal.tsx:29](src/components/customer/WaiverModal.tsx:29).
- Session timer warns at five minutes and sixty seconds, with visual states to keep mechanics on schedule [src/components/session/SessionTimer.tsx:43](src/components/session/SessionTimer.tsx:43).
- Single-active-session enforcement protects supply and customer experience during intake and fulfilment [src/app/api/intake/start/route.ts:145](src/app/api/intake/start/route.ts:145), [src/lib/fulfillment.ts:154](src/lib/fulfillment.ts:154).
- Support chat reflects live availability windows and offline messaging workflows, reinforcing responsiveness [src/components/chat/FloatingChatPopup.tsx:156](src/components/chat/FloatingChatPopup.tsx:156).

---

## 8. Delivery Status & Backlog Highlights

| Area | Status | Evidence | Next Steps |
| --- | --- | --- | --- |
| Customer acquisition & intake | Live | Landing/pricing, auth-guarded intake, CRM logging [src/app/page.tsx:7](src/app/page.tsx:7), [src/app/intake/page.tsx:66](src/app/intake/page.tsx:66), [src/app/api/intake/start/route.ts:97](src/app/api/intake/start/route.ts:97) | Add automated reminders & geo-pricing once analytics dictate |
| Live service delivery | Live | LiveKit room with device checks, timer, extensions [src/app/diagnostic/[id]/VideoSessionClient.tsx:21](src/app/diagnostic/[id]/VideoSessionClient.tsx:21) | Finalise upgrade payment flow placeholder [src/app/api/sessions/[id]/upgrade/route.ts:6](src/app/api/sessions/[id]/upgrade/route.ts:6) |
| Mechanic onboarding | Live (manual approval) | Multi-step form, document capture [src/app/mechanic/signup/page.tsx:1](src/app/mechanic/signup/page.tsx:1) | Implement notification emails & background check integration [src/app/api/mechanic/signup/route.ts:68](src/app/api/mechanic/signup/route.ts:68) |
| Workshop portal | Beta | Dashboard + invite modal [src/app/workshop/dashboard/page.tsx:18](src/app/workshop/dashboard/page.tsx:18) | Build real revenue metrics & session feeds [src/app/api/workshop/dashboard/route.ts:116](src/app/api/workshop/dashboard/route.ts:116) |
| CRM & analytics | Live (foundational) | Interaction logging + upsell generator [src/lib/crm.ts:74](src/lib/crm.ts:74) | Surface metrics in customer/admin dashboards |
| Notifications & comms | Partial | Support bubble, waiver email hook [src/components/chat/FloatingChatPopup.tsx:156](src/components/chat/FloatingChatPopup.tsx:156), [src/app/api/sessions/[id]/summary/route.ts:123](src/app/api/sessions/[id]/summary/route.ts:123) | Wire transactional emails/SMS in RFQ & workshop flows [src/lib/rfq/notifications.ts:12](src/lib/rfq/notifications.ts:12) |
| Compliance automation | In progress | RLS tests, waiver enforcement [tests/e2e/rls-policies.spec.ts:1](tests/e2e/rls-policies.spec.ts:1) | Automate admin approvals & audit notifications [src/app/api/admin/mechanics/[id]/approve/route.ts:38](src/app/api/admin/mechanics/[id]/approve/route.ts:38) |

Additional backlog accelerators include:
- Session upgrade payment capture and quote automation [src/app/api/quotes/[quoteId]/respond/route.ts:57](src/app/api/quotes/[quoteId]/respond/route.ts:57).
- Workshop revenue metrics and alerts [src/app/api/workshop/dashboard/route.ts:116](src/app/api/workshop/dashboard/route.ts:116), [src/lib/analytics/workshopAlerts.ts:19](src/lib/analytics/workshopAlerts.ts:19).
- Email/SMS delivery for compliance and onboarding events [src/lib/notifications/compliance-notifications.ts:9](src/lib/notifications/compliance-notifications.ts:9).

---

## 9. Investment Considerations

- **Strategic fit:** Remote diagnostics is growing as dealerships downsize front-of-house service. AutoDoctor marries certified expertise with software-first workflows, lowering CAC via free trials while expanding LTV through upgrades and follow-ups.
- **Defensibility:** Verified mechanic onboarding, workshop partnerships, and realtime infrastructure create high switching costs. Compliance tooling and RLS-tested data paths underpin enterprise-readiness.
- **Scale levers:** Credits, upsells, workshop revenue-share, and planned corporate programs provide multiple monetisation tracks once demand scales. Existing architecture (persistent channels, CRM RPCs, modular guards) supports rapid expansion into fleets and insurance partners.

---

## 10. Appendices (Key Artefacts Reviewed)

- Customer-facing experiences: `src/app/page.tsx`, `src/app/services-pricing/page.tsx`, `src/app/intake/page.tsx`
- Mechanic & workshop ops: `src/app/mechanic/dashboard/page.tsx`, `src/app/workshop/dashboard/page.tsx`
- Realtime and fulfilment core: `src/lib/fulfillment.ts`, `src/lib/realtimeChannels.ts`
- Safety & compliance: `src/components/customer/WaiverModal.tsx`, `tests/e2e/rls-policies.spec.ts`
- Monetisation & CRM: `src/config/pricing.ts`, `src/lib/crm.ts`

*End of briefing*
