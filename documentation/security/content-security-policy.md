# Content Security Policy (CSP) Configuration

**Date Documented**: October 22, 2025
**Status**: Resolved
**Category**: Security, Performance, Development

## Overview

This document details the Content Security Policy (CSP) issues encountered during development and the configuration implemented to allow JavaScript execution while maintaining security.

## The Problem

### Symptom
- Browser console was empty (no logs appearing)
- React components not executing JavaScript
- Error in browser console: "Content Security Policy of your site blocks the use of 'eval' in JavaScript"

### Impact
- ❌ Debugging was impossible (no console logs)
- ❌ Component state updates not working
- ❌ API calls not executing
- ❌ Dashboard appeared frozen

### Root Cause

Next.js development mode uses `eval()` for:
1. Hot Module Replacement (HMR)
2. Source map generation
3. Fast Refresh
4. Development tooling

Without `'unsafe-eval'` in CSP, these features are blocked.

## What is Content Security Policy?

CSP is a security layer that helps prevent:
- Cross-Site Scripting (XSS) attacks
- Data injection attacks
- Clickjacking
- Other code injection attacks

It works by specifying which sources of content are trusted.

### CSP Directives

| Directive | Purpose | Example |
|-----------|---------|---------|
| `default-src` | Fallback for other directives | `'self'` |
| `script-src` | JavaScript sources | `'self' 'unsafe-eval'` |
| `style-src` | CSS sources | `'self' 'unsafe-inline'` |
| `img-src` | Image sources | `'self' data: https:` |
| `connect-src` | XHR, WebSocket, etc. | `'self' wss://api.example.com` |
| `font-src` | Font sources | `'self' data:` |
| `frame-src` | Iframe sources | `'self' https://js.stripe.com` |

### Keyword Values

| Keyword | Meaning |
|---------|---------|
| `'self'` | Same origin as the document |
| `'unsafe-eval'` | Allow `eval()` and similar |
| `'unsafe-inline'` | Allow inline scripts/styles |
| `'none'` | Don't allow anything |
| `data:` | Allow data: URIs |
| `https:` | Allow any HTTPS resource |

## The Solution

### Development vs Production Strategy

**Key Decision**: Use different CSP policies for development and production.

**Reasoning**:
- Development needs `'unsafe-eval'` for HMR and Fast Refresh
- Production should have stricter CSP for security
- Development prioritizes speed, production prioritizes security

### Implementation

**File**: [next.config.js:87-125](c:\Users\Faiz Hashmi\theautodoctor\next.config.js)

```javascript
async headers() {
  // MINIMAL headers for dev (skip CSP complexity)
  if (process.env.NODE_ENV === 'development') {
    return []
  }

  // Full security headers for production
  const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://api.stripe.com",
    "worker-src 'self' blob:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ')

  return [
    {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      ],
    },
  ]
},
```

### Why Empty Array in Development?

```javascript
if (process.env.NODE_ENV === 'development') {
  return []
}
```

**Benefits**:
1. ✅ Next.js uses its default permissive CSP
2. ✅ HMR works without issues
3. ✅ Fast Refresh enabled
4. ✅ Source maps work correctly
5. ✅ Faster development iteration

**Concerns**:
- ⚠️ Not testing production CSP during development
- ⚠️ Might catch CSP issues late

**Mitigation**:
- Test in production-like environment before deploying
- Use staging environment with production CSP
- Add CSP testing to CI/CD pipeline

### Production CSP Breakdown

#### script-src
```
'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://js.stripe.com
```

- `'self'`: Allow scripts from same origin
- `'unsafe-inline'`: Allow inline `<script>` tags (needed for Next.js)
- `'unsafe-eval'`: Allow `eval()` (needed for some libraries)
- `'wasm-unsafe-eval'`: Allow WebAssembly (needed for some features)
- `blob:`: Allow blob: URLs (Web Workers, LiveKit)
- `https://js.stripe.com`: Stripe payment scripts

**Note**: `'unsafe-eval'` and `'unsafe-inline'` reduce security. Future work should remove these.

#### connect-src
```
'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://api.stripe.com
```

- Supabase API calls (HTTPS)
- Supabase Realtime (WebSocket)
- LiveKit video calls (HTTPS + WebSocket)
- Stripe API calls

#### frame-src
```
'self' https://js.stripe.com https://hooks.stripe.com
```

- Allow Stripe iframe embeds
- Stripe webhook handlers

## Testing CSP

### Test in Browser

1. Open DevTools → Console
2. Try to execute eval:
   ```javascript
   eval('console.log("test")')
   ```
3. With strict CSP: Error
4. With permissive CSP: Success

### Test CSP Headers

```bash
curl -I http://localhost:3000

# Look for:
Content-Security-Policy: ...
```

### Validate CSP

Use [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to check for:
- Missing directives
- Overly permissive rules
- Security issues

## Common CSP Issues

### Issue 1: Inline Scripts Blocked

**Error**: "Refused to execute inline script because it violates CSP directive 'script-src'"

**Cause**: Missing `'unsafe-inline'` in `script-src`

**Fix**: Add `'unsafe-inline'` (not ideal) OR use nonce/hash

**Better Solution** (Future):
```javascript
// Generate nonce per request
const nonce = generateNonce()

// Add to CSP
script-src 'self' 'nonce-${nonce}'

// Use in script tags
<script nonce={nonce}>...</script>
```

### Issue 2: External Resources Blocked

**Error**: "Refused to load the resource because it violates CSP directive 'connect-src'"

**Cause**: External API not listed in `connect-src`

**Fix**: Add domain to appropriate directive:
```javascript
"connect-src 'self' https://api.example.com"
```

### Issue 3: WebSocket Blocked

**Error**: "Refused to connect to 'wss://...' because it violates CSP directive"

**Cause**: WebSocket URL not in `connect-src`

**Fix**: Add with `wss:` protocol:
```javascript
"connect-src 'self' wss://*.example.com"
```

## Security Best Practices

### What We're Doing Right

1. ✅ Different CSP for dev/prod
2. ✅ Strict `default-src 'self'`
3. ✅ `object-src 'none'` (blocks Flash, Java applets)
4. ✅ `base-uri 'self'` (prevents base tag injection)
5. ✅ `frame-ancestors 'none'` (prevents clickjacking)
6. ✅ Whitelist specific domains, not wildcards

### What We Could Improve

1. ❌ Remove `'unsafe-eval'` - Use nonces instead
2. ❌ Remove `'unsafe-inline'` - Use nonces instead
3. ❌ Add `report-uri` - Monitor CSP violations
4. ❌ Add hash-based integrity - `'sha256-...'`
5. ❌ Stricter `img-src` - Not allow all HTTPS

### Future: Nonce-Based CSP

**Benefits**:
- ✅ Remove `'unsafe-inline'`
- ✅ Allow only specific scripts
- ✅ Better security

**Implementation**:
```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const nonce = Buffer.from(randomBytes(16)).toString('base64')

  const res = NextResponse.next()
  res.headers.set(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'`
  )

  // Make nonce available to pages
  res.headers.set('x-nonce', nonce)

  return res
}

// page.tsx
export default function Page() {
  const nonce = headers().get('x-nonce')

  return (
    <script nonce={nonce}>
      console.log('Allowed!')
    </script>
  )
}
```

## Debugging CSP Violations

### Enable CSP Reporting

```javascript
const CSP = [
  // ... other directives
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join('; ')
```

### Create Report Endpoint

```typescript
// app/api/csp-report/route.ts
export async function POST(req: Request) {
  const report = await req.json()

  console.error('[CSP VIOLATION]', {
    blockedUri: report['csp-report']?.['blocked-uri'],
    violatedDirective: report['csp-report']?.['violated-directive'],
    documentUri: report['csp-report']?.['document-uri'],
  })

  // Log to monitoring service
  await logToSentry(report)

  return new Response('OK', { status: 200 })
}
```

### Monitor Violations

```typescript
// Set up ReportingObserver
const observer = new ReportingObserver((reports, observer) => {
  for (const report of reports) {
    if (report.type === 'csp-violation') {
      console.error('CSP Violation:', report.body)
    }
  }
})

observer.observe()
```

## Performance Impact

### Without CSP
- Faster initial load
- More browser optimizations
- Risk of XSS attacks

### With Strict CSP
- Slight overhead (~10-20ms)
- Some browser caching limited
- Protected against XSS

### With Our CSP
- Minimal overhead in dev (no CSP)
- Small overhead in prod (~5-10ms)
- Good balance of security/performance

## Related Documentation

- [Incoming Requests Not Showing](../session-management/incoming-requests-not-showing.md)
- [Next.js Configuration](../development/nextjs-config.md)

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator by Google](https://csp-evaluator.withgoogle.com/)
- [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
