# UI Polish Status & Implementation Plan

Based on the wireframe spec provided, here's what's been done vs. what needs implementation.

---

## ✅ **ALREADY COMPLETE**

### Task 10: Production Polish (Completed)
- ✅ Removed debug banner from ChatRoomV3 (lines 710-729 deleted)
- ✅ Fixed "📎 Attachment" placeholder → "Attachment"
- ✅ Removed debug info panel from mechanic dashboard

### Session Overhaul Tasks 1-9
- ✅ Server-authoritative timers (no free overtime)
- ✅ Idempotent Stripe extensions
- ✅ Real file storage
- ✅ WebSocket efficiency
- ✅ FSM validation
- ✅ Device preflight + reconnect UX
- ✅ Post-session summaries
- ✅ Cron monitoring
- ✅ E2E tests

---

## 🚧 **NEEDS IMPLEMENTATION**

### 1. Mechanic Dashboard Polish

**Current State:**
- Has debug elements removed but needs layout improvements
- Verbose cards with duplicate information
- Not optimized for mobile

**Wireframe Requirements:**
```
Header: avatar • "Next Availability" chip • Refresh • connection pill
Stats ribbon: Active sessions • Pending requests • Upcoming schedule
My Active Work: compact rows (customer, plan, payout, timer) + badges
Available Requests: grid with Accept/Decline
```

**Actions Needed:**
- [ ] Add stats ribbon (compact, top)
- [ ] Simplify active session cards (remove duplicate tags)
- [ ] Add connection quality pill
- [ ] Make responsive (2-col desktop → 1-col mobile)
- [ ] Add "Stuck?" drawer with support link

---

### 2. Customer Dashboard Polish

**Current State:**
- Has marketing gradients and verbose prose
- Not task-focused

**Wireframe Requirements:**
```
Progress tracker: Intake → Photos → Session → Summary (checkmarks)
Plan card: Schedule CTA, "Compare plans" secondary
Prep card: presence indicator + ETA
Session card: Join button, prep checklist
History: rating prompt, summary download
```

**Actions Needed:**
- [ ] Remove marketing gradients
- [ ] Add progress tracker component
- [ ] Simplify plan cards
- [ ] Add presence indicators
- [ ] Create follow-up panel

---

### 3. Chat Session Polish

**Current State:**
- Already has timer, presence, file sharing
- Needs UI cleanup

**Wireframe Requirements:**
```
Header: back • mechanic badge • timer pill • presence
Stream: color-coded bubbles • quick reply chips
Right drawer: intake • files • checklist (collapsible)
Compose: text • attach • canned prompts • Extend CTA
```

**Actions Needed:**
- [ ] Add quick reply chips
- [ ] Add canned prompts ("Share VIN", "Upload video")
- [ ] Make right drawer collapsible
- [ ] Add intake snapshot to drawer
- [ ] Improve mobile bottom sheet for Extend

---

### 4. Video Session Polish

**Current State:**
- Has preflight, reconnect UX
- Needs layout improvements

**Wireframe Requirements:**
```
Preflight: device chooser • audio meter • bandwidth • Ready button
In-session: main video + PiP • connection quality badge
Controls: mic/cam/share • file • Extend • End
Side drawer: notes timeline • files • checklist
```

**Actions Needed:**
- [ ] Add bandwidth indicator to preflight
- [ ] Add connection quality badge during session
- [ ] Add notes timeline to side drawer
- [ ] Make side drawer collapsible
- [ ] Improve mobile controls

---

### 5. Cross-Device Improvements

**Actions Needed:**
- [ ] Responsive layouts (CSS grid: 1→3 columns)
- [ ] Sticky action bars on mobile
- [ ] Tabbed lists for mechanics (Active, Pending, Upcoming, History)
- [ ] Wizard checklist for customers
- [ ] Status badge system: Live=red, Waiting=amber, Scheduled=slate
- [ ] Presence chips (avatar + status) everywhere
- [ ] Mobile swipe cards for pending requests
- [ ] Touch targets ≥44px
- [ ] Keyboard focus visible
- [ ] Lazy-load heavy panels
- [ ] Skeleton loaders
- [ ] Bottom sheets for mobile modals
- [ ] Prevent layout shift

---

## 📝 **Implementation Priority**

### High Priority (Do First)
1. **Presence Indicators** - Add avatar + status pills across all views
2. **Status Badge System** - Standardize Live/Waiting/Scheduled badges
3. **Responsive Layouts** - Make dashboards mobile-friendly
4. **Remove Verbose UI** - Simplify cards, remove duplicates

### Medium Priority
5. **Quick Actions** - Add canned prompts, quick reply chips
6. **Connection Quality** - Add network indicators
7. **Collapsible Drawers** - Make side panels collapsible
8. **Progress Tracking** - Add customer progress tracker

### Low Priority (Nice to Have)
9. **Swipe Gestures** - Mobile swipe for Accept/Decline
10. **Timeline Views** - Notes timeline in video
11. **Advanced Filters** - Queue filtering for mechanics

---

## 🎯 **What to Remove (Immediate)**

These are remnants that should be deleted:

### In Mechanic Dashboard:
- ❌ Any remaining debug console outputs
- ❌ Duplicate intake/file tags on active session cards
- ❌ Long descriptive copy (move to tooltips)

### In Customer Dashboard:
- ❌ Marketing gradient backgrounds
- ❌ Verbose promotional prose
- ❌ Hero blocks with long copy

### In Chat:
- ❌ Duplicate info toasts
- ❌ Placeholder text artifacts

### In Video:
- ❌ Mock file API references (already using real storage)
- ❌ Misleading "shared files" labels if storage not configured

---

## 💡 **Design System Tokens**

To implement consistently:

### Colors
```
Live/Active: red-500
Waiting/Pending: amber-500
Scheduled/Upcoming: slate-500
Success: green-500
Error: red-500
```

### Typography
```
Base: 16px
Section Headers: 24px
Card Titles: 18px
Body: 16px
Small: 14px
```

### Spacing
```
Touch Targets: ≥44px
Card Padding: 16px
Section Gap: 24px
```

### Components
```
Status Pills: rounded-full, small badge
Presence Chips: avatar + colored dot
Action Buttons: primary CTA prominent, secondary links below
```

---

## 🚀 **Next Steps**

1. Implement presence indicator component
2. Create status badge component
3. Update mechanic dashboard layout
4. Update customer dashboard layout
5. Add responsive CSS
6. Run build and test
7. Deploy

---

**Last Updated**: 2025-01-24
