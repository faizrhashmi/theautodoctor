/**
 * Open Redirect Prevention
 *
 * SECURITY: Prevents attackers from redirecting users to malicious sites
 * by validating all redirect URLs against an allowlist.
 *
 * @module security/redirects
 */

/**
 * Allowed redirect paths (must start with one of these)
 * SECURITY: Only allow internal redirects, never external URLs
 */
const ALLOWED_REDIRECT_PATHS = [
  // Customer routes
  '/customer/dashboard',
  '/customer/schedule',
  '/customer/verify-email',
  '/dashboard',

  // Mechanic routes
  '/mechanic/dashboard',
  '/mechanic/availability',
  '/mechanic/session',
  '/mechanic/onboarding',

  // Admin routes
  '/admin/intakes',
  '/admin/sessions',
  '/admin/dashboard',

  // Session routes
  '/session',
  '/video',
  '/chat',

  // Auth routes
  '/auth/callback',

  // Public routes
  '/',
  '/pricing',
  '/about',
  '/contact',
]

/**
 * Validate a redirect URL to prevent open redirects
 *
 * @param redirectUrl - The URL to validate
 * @param defaultRedirect - Fallback URL if validation fails
 * @returns Sanitized redirect URL (relative path only)
 *
 * @example
 * // Safe redirect
 * validateRedirect('/customer/dashboard') // => '/customer/dashboard'
 *
 * // Blocked - external URL
 * validateRedirect('https://evil.com') // => '/' (defaultRedirect)
 *
 * // Blocked - not in allowlist
 * validateRedirect('/evil/path') // => '/' (defaultRedirect)
 */
export function validateRedirect(
  redirectUrl: string | null | undefined,
  defaultRedirect: string = '/'
): string {
  // No redirect provided - use default
  if (!redirectUrl) {
    return defaultRedirect
  }

  // Decode URL in case it's encoded
  const decoded = decodeURIComponent(redirectUrl)

  // SECURITY: Block absolute URLs (external redirects)
  try {
    // If this successfully creates a URL object with a protocol, it's absolute
    const url = new URL(decoded)

    // Even if it's absolute, only allow same-origin
    if (typeof window !== 'undefined') {
      if (url.origin === window.location.origin) {
        // Same origin - validate the pathname
        return validatePathname(url.pathname, defaultRedirect)
      }
    }

    // Different origin - block it
    console.warn('[validateRedirect] Blocked external redirect:', decoded)
    return defaultRedirect
  } catch {
    // Not a valid URL - assume it's a relative path
    // This is good - relative paths are what we want
  }

  // SECURITY: Block protocol-relative URLs (//example.com)
  if (decoded.startsWith('//')) {
    console.warn('[validateRedirect] Blocked protocol-relative redirect:', decoded)
    return defaultRedirect
  }

  // SECURITY: Block data URLs (data:text/html,<script>...)
  if (decoded.startsWith('data:')) {
    console.warn('[validateRedirect] Blocked data URL redirect:', decoded)
    return defaultRedirect
  }

  // SECURITY: Block javascript URLs (javascript:alert(1))
  if (decoded.toLowerCase().startsWith('javascript:')) {
    console.warn('[validateRedirect] Blocked javascript URL redirect:', decoded)
    return defaultRedirect
  }

  // Validate against allowlist
  return validatePathname(decoded, defaultRedirect)
}

/**
 * Validate a pathname against the allowlist
 */
function validatePathname(pathname: string, defaultRedirect: string): string {
  // Remove query params and hash for validation
  const pathOnly = pathname.split('?')[0]?.split('#')[0] ?? pathname

  // Check if path starts with an allowed prefix
  const isAllowed = ALLOWED_REDIRECT_PATHS.some(allowed =>
    pathOnly === allowed || pathOnly.startsWith(`${allowed}/`)
  )

  if (!isAllowed) {
    console.warn('[validateRedirect] Blocked disallowed path:', pathOnly)
    return defaultRedirect
  }

  // Path is allowed - return it with query params/hash intact
  return pathname
}

/**
 * Get redirect URL from query parameters (safe)
 *
 * @param searchParams - URLSearchParams or query object
 * @param paramName - Name of the redirect parameter (default: 'redirect')
 * @param defaultRedirect - Fallback URL if none provided or invalid
 * @returns Validated redirect URL
 *
 * @example
 * const params = new URLSearchParams('?redirect=/customer/dashboard')
 * const redirect = getRedirectFromQuery(params) // => '/customer/dashboard'
 */
export function getRedirectFromQuery(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  paramName: string = 'redirect',
  defaultRedirect: string = '/'
): string {
  let redirectUrl: string | null = null

  if (searchParams instanceof URLSearchParams) {
    redirectUrl = searchParams.get(paramName)
  } else {
    const value = searchParams[paramName]
    redirectUrl = Array.isArray(value) ? value[0] ?? null : value ?? null
  }

  return validateRedirect(redirectUrl, defaultRedirect)
}

/**
 * Build a login URL with a safe redirect parameter
 *
 * @param loginPath - Path to the login page
 * @param redirectTo - Where to redirect after login
 * @param redirectParamName - Name of the redirect parameter
 * @returns Full login URL with validated redirect
 *
 * @example
 * buildLoginUrl('/customer/login', '/customer/dashboard')
 * // => '/customer/login?redirect=%2Fcustomer%2Fdashboard'
 */
export function buildLoginUrl(
  loginPath: string,
  redirectTo?: string | null,
  redirectParamName: string = 'redirect'
): string {
  const validRedirect = validateRedirect(redirectTo)

  // Only add redirect param if it's not the default
  if (validRedirect === '/') {
    return loginPath
  }

  const params = new URLSearchParams()
  params.set(redirectParamName, validRedirect)

  return `${loginPath}?${params.toString()}`
}
