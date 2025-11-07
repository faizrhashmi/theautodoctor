# Debug LiveKit Connection Issue

**Problem:** Both customer and mechanic see "Waiting for..." messages even though both are on the page.

---

## 🔍 STEP-BY-STEP DEBUG

### **Step 1: Check Browser Console Logs**

Both customer and mechanic should open browser console (F12 → Console) and look for:

**Expected logs:**
```
[DIAGNOSTIC PAGE SECURITY] Role assigned: MECHANIC
[VIDEO] Setting up session:ended broadcast listener
[ParticipantMonitor] ===== PRESENCE STATE CHANGE =====
[ParticipantMonitor] Total participants: 1
[ParticipantMonitor]   - mechanic-{id}: mechanic
```

**Customer should see:**
```
[DIAGNOSTIC PAGE SECURITY] Role assigned: CUSTOMER
[ParticipantMonitor]   - customer-{id}: customer
```

---

### **Step 2: Check LiveKit Connection Status**

In console, look for:
- ✅ `Connected to LiveKit` or similar success message
- ❌ Connection errors, WebSocket errors, or authentication failures

Common errors:
- `WebSocket connection failed` = LiveKit server unreachable
- `Invalid token` = Token generation issue
- `Room not found` = Different room names

---

### **Step 3: Verify Same Room Name**

Both users should be joining: `session-470bd84a-ee7b-414f-964f-70001c674b66`

Check server console logs for:
```
[DIAGNOSTIC PAGE SECURITY] { sessionId: '470bd84a-ee7b-414f-964f-70001c674b66', ... }
```

---

### **Step 4: Check LiveKit Environment Variables**

Are these set in `.env.local`?
```
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-instance.livekit.cloud
```

---

### **Step 5: Test LiveKit Server**

Open: https://your-instance.livekit.cloud

Should see: LiveKit server page (not a 404 or error)

---

## 🔧 COMMON FIXES

### **Issue A: LiveKit Not Configured**

**Symptoms:** No connection logs, immediate failure

**Fix:**
1. Sign up at https://livekit.io
2. Create a project
3. Copy API keys to `.env.local`
4. Restart server (`npm run dev`)

---

### **Issue B: Testing on Same Machine**

**Symptoms:** Only one participant detected, or role confusion

**Fix:** Add `?skipPreflight=true` to URL:
```
http://localhost:3000/diagnostic/470bd84a-ee7b-414f-964f-70001c674b66?skipPreflight=true
```

This skips device checks that can interfere with same-machine testing.

---

### **Issue C: Participants Join But Not Detected**

**Symptoms:** See connection logs but still "Waiting for..."

**Fix:** Check participant identity in console logs.

Should see:
```
[ParticipantMonitor]   - mechanic-1daec681-04cf-4640-9b98-d5369361e366: mechanic
[ParticipantMonitor]   - customer-f4d90392-118c-4738-ab16-94689f039f2a: customer
```

If you see different identities or "UNKNOWN" role, the metadata isn't being parsed correctly.

---

### **Issue D: Token Expired**

**Symptoms:** Initial connection, then immediate disconnect

**Fix:** Refresh both pages to get new tokens.

---

## 🧪 QUICK TEST PROCEDURE

1. **Customer browser:**
   - Open: http://localhost:3000/diagnostic/470bd84a-ee7b-414f-964f-70001c674b66
   - Open Console (F12)
   - Complete preflight
   - Look for logs about joining room

2. **Mechanic browser:**
   - Open: http://localhost:3000/diagnostic/470bd84a-ee7b-414f-964f-70001c674b66
   - Open Console (F12)
   - Complete preflight
   - Look for logs about joining room

3. **Both should see:**
   - ✅ "Connected to LiveKit"
   - ✅ ParticipantMonitor logs showing 2 participants
   - ✅ Waiting room should disappear
   - ✅ Video interface should show

---

## 📋 CHECKLIST

- [ ] LiveKit environment variables are set
- [ ] Both users can access the same URL
- [ ] Console shows connection success (no errors)
- [ ] Console shows ParticipantMonitor detecting participants
- [ ] Room name matches on both sides
- [ ] Identities are correctly formatted (mechanic-{id}, customer-{id})
- [ ] Metadata includes role field

---

## 🆘 IF STILL NOT WORKING

Run these checks and report back:

### **Customer Console:**
```
1. What does [DIAGNOSTIC PAGE SECURITY] log show?
   - Role assigned: CUSTOMER or MECHANIC?
   - sessionId matches?

2. What does ParticipantMonitor log show?
   - How many participants?
   - What identities?
   - What roles detected?

3. Any red error messages?
```

### **Mechanic Console:**
```
Same questions as above
```

### **Server Console (where npm run dev is running):**
```
1. Any LiveKit token generation errors?
2. Any "Role assigned" logs showing both users?
```

---

**Next:** Tell me what you see in the console logs for both customer and mechanic!
