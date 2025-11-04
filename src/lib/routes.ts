/**
 * Central Routing System
 *
 * Single source of truth for all URLs in the application.
 * Use these helpers everywhere instead of hardcoding paths.
 *
 * Golden Guardrails:
 * - Always use routeFor.* for UI navigation
 * - Always use apiRouteFor.* for API calls
 * - Never hardcode paths directly
 * - Deep-link capable (notifications, emails)
 */

/**
 * Customer-facing UI routes
 */
export const routeFor = {
  // Sessions
  session: (id: string) => `/sessions/${id}`,
  sessionReport: (id: string) => `/sessions/${id}/report`,
  video: (id: string) => `/video/${id}`,
  chat: (id: string) => `/chat/${id}`,

  // Customer Dashboard
  customerDashboard: () => `/customer/dashboard`,
  customerSessions: () => `/customer/sessions`,
  customerVehicles: () => `/customer/vehicles`,
  customerProfile: () => `/customer/profile`,
  customerSettings: () => `/customer/settings`,
  customerPrivacySettings: () => `/customer/settings/privacy`,
  customerDataDownload: () => `/customer/settings/privacy/download-data`,
  customerDeleteAccount: () => `/customer/settings/privacy/delete-account`,
  customerSchedule: () => `/customer/schedule`,
  customerPlans: () => `/customer/plans`,

  // Booking
  book: (params?: { mechanic?: string }) => {
    const url = `/book`
    if (!params?.mechanic) return url
    return `${url}?mechanic=${params.mechanic}`
  },

  // Quotes & RFQ (LEGACY - deprecated, use quotesAndJobs)
  quote: (id: string) => `/customer/quotes/${id}`,
  quotes: () => `/customer/quotes`,
  quotePaymentSuccess: (quoteId: string) => `/customer/quotes/${quoteId}/payment/success`, // Phase 1.3
  quotePaymentCancel: (quoteId: string) => `/customer/quotes/${quoteId}/payment/cancel`, // Phase 1.3
  rfqCreate: (params?: { session_id?: string; prefill?: boolean }) => {
    const url = `/customer/rfq/create`
    if (!params) return url
    const searchParams = new URLSearchParams()
    if (params.session_id) searchParams.set('session_id', params.session_id)
    if (params.prefill) searchParams.set('prefill', 'true')
    return searchParams.toString() ? `${url}?${searchParams.toString()}` : url
  },
  rfqBids: (id: string) => `/customer/rfq/${id}/bids`,
  rfqDetails: (id: string) => `/customer/rfq/${id}`,
  rfqBidPaymentSuccess: (rfqId: string, bidId: string) => `/customer/rfq/${rfqId}/bids/${bidId}/payment/success`, // Phase 1.4
  rfqBidPaymentCancel: (rfqId: string, bidId: string) => `/customer/rfq/${rfqId}/bids/${bidId}/payment/cancel`, // Phase 1.4

  // Unified Quotes & Jobs (Phase 4)
  quotesAndJobs: (params?: { status?: string; sessionId?: string }) => {
    const url = `/customer/quotes-and-jobs`
    if (!params) return url
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.sessionId) searchParams.set('sessionId', params.sessionId)
    return searchParams.toString() ? `${url}?${searchParams.toString()}` : url
  },
  offerDetail: (offerId: string, source: 'direct' | 'rfq') => `/customer/offers/${offerId}?source=${source}`,

  // Repairs/Jobs (Phase 3 & 4)
  repair: (id: string) => `/customer/repairs/${id}`,
  repairs: () => `/customer/repairs`,
  job: (id: string) => `/customer/jobs/${id}`, // Alias for repair
  jobs: () => `/customer/jobs`, // Alias for repairs

  // Loyalty & Retention (Phase 4)
  referrals: () => `/customer/referrals`,
  credits: () => `/customer/credits`,
  maintenance: () => `/customer/maintenance`,

  // Mechanic Dashboard
  mechanicDashboard: (params?: { request?: string }) => {
    const url = `/mechanic/dashboard`
    if (!params?.request) return url
    return `${url}?request=${params.request}`
  },
  mechanicSessions: () => `/mechanic/sessions`,
  mechanicEarnings: () => `/mechanic/earnings`,
  mechanicProfile: () => `/mechanic/profile`,

  // Workshop Dashboard
  workshopDashboard: () => `/workshop/dashboard`,
  workshopRfqs: () => `/workshop/rfqs`,
  workshopJobs: () => `/workshop/jobs`,
  workshopJob: (id: string) => `/workshop/jobs/${id}`,
  workshopProfile: () => `/workshop/profile`,
  workshopAnalytics: () => `/workshop/analytics`,
  workshopPaymentRefund: (paymentId: string) => `/workshop/payments/${paymentId}/refund`,

  // Admin Dashboard (Phase 4)
  adminDashboard: () => `/admin/dashboard`,
  adminQuotes: () => `/admin/quotes`,
  adminRfqs: () => `/admin/rfqs`,
  adminJobs: () => `/admin/jobs`,
  adminJob: (id: string) => `/admin/jobs/${id}`,
  adminPayments: () => `/admin/payments`,
  adminRefunds: () => `/admin/refunds`,
  adminWorkshops: () => `/admin/workshops`,
  adminMechanics: () => `/admin/mechanics`,
  adminCustomers: () => `/admin/customers`,

  // Auth
  login: () => `/login`,
  signup: () => `/signup`,
  logout: () => `/logout`,
  mechanicLogin: () => `/mechanic/login`,

  // Public
  home: () => `/`,
  about: () => `/about`,
  pricing: () => `/pricing`,
  contact: () => `/contact`,
}

/**
 * API routes (for fetch calls)
 */
export const apiRouteFor = {
  // Session APIs
  session: (id: string) => `/api/sessions/${id}`,
  sessionEnd: (id: string) => `/api/sessions/${id}/end`,
  sessionCancel: (id: string) => `/api/sessions/${id}/cancel`,
  sessionSummary: (id: string) => `/api/sessions/${id}/summary`,
  sessionPdf: (id: string) => `/api/sessions/${id}/pdf`,
  sessions: () => `/api/sessions`,

  // Quote APIs (LEGACY)
  quote: (id: string) => `/api/quotes/${id}`,
  quoteRespond: (id: string) => `/api/quotes/${id}/respond`, // Phase 1.3
  quotes: () => `/api/customer/quotes`, // Customer quotes list

  // RFQ APIs (LEGACY)
  rfq: (id: string) => `/api/rfq/${id}`,
  rfqCreate: () => `/api/rfq/customer/create`,
  rfqAccept: (id: string) => `/api/rfq/${id}/accept`, // Phase 1.4
  rfqBids: (id: string) => `/api/rfq/${id}/bids`,
  rfqs: () => `/api/rfq`,

  // Unified Offers API (Phase 4)
  quoteOffers: (params?: { status?: string; sort?: string; sessionId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.sessionId) searchParams.set('sessionId', params.sessionId)
    const base = `/api/customer/quotes/offers`
    return searchParams.toString() ? `${base}?${searchParams.toString()}` : base
  },
  offerDetail: (offerId: string, source: 'direct' | 'rfq') => `/api/customer/quotes/offers/${offerId}?source=${source}`,
  acceptOffer: (offerId: string) => `/api/customer/quotes/offers/${offerId}/accept`,

  // Vehicle APIs
  vehicle: (id: string) => `/api/vehicles/${id}`,
  vehicles: () => `/api/vehicles`,
  customerVehicles: () => `/api/customer/vehicles`,
  vinDecode: () => `/api/vehicles/vin-decode`,

  // Jobs APIs (Phase 4)
  jobs: () => `/api/customer/jobs`,
  job: (id: string) => `/api/customer/jobs/${id}`,
  jobUpdates: (id: string) => `/api/customer/jobs/${id}/updates`,

  // Repair APIs (LEGACY - use jobs)
  repair: (id: string) => `/api/repairs/${id}`,
  repairs: () => `/api/repairs`,

  // Payment APIs
  createCheckout: () => `/api/payments/create-checkout`,
  quotePaymentCheckout: (quoteId: string) => `/api/quotes/${quoteId}/payment/checkout`, // Phase 1.3
  rfqBidPaymentCheckout: (rfqId: string, bidId: string) => `/api/rfq/${rfqId}/bids/${bidId}/payment/checkout`, // Phase 1.4
  repairPaymentRefund: (paymentId: string) => `/api/repair-payments/${paymentId}/refund`, // Phase 1.5
  stripeWebhook: () => `/api/stripe/webhook`,
  refund: (sessionId: string) => `/api/sessions/${sessionId}/refund`, // For session refunds

  // Auth APIs
  customerLogin: () => `/api/customer/login`,
  mechanicLogin: () => `/api/mechanic/login`,
  workshopLogin: () => `/api/workshop/login`,
  setSession: () => `/api/auth/set-session`,

  // User & Profile APIs
  profile: () => `/api/profile`,
  updateProfile: () => `/api/profile/update`,
  onboardingProgress: () => `/api/customer/onboarding/progress`, // Phase 2.1
  customerSessionsApi: () => `/api/customer/sessions`,
  mechanicsMe: () => `/api/mechanics/me`,

  // Notification APIs
  notifications: () => `/api/notifications`,
  notificationsFeed: (limit: number = 50) => `/api/notifications/feed?limit=${limit}`,
  notificationsMarkRead: () => `/api/notifications/mark-read`,
  notificationsClearRead: () => `/api/notifications/clear-read`,
  notificationRead: (id: string) => `/api/notifications/${id}/read`,

  // Loyalty APIs (Phase 4)
  referrals: () => `/api/referrals`,
  credits: () => `/api/credits`,
  maintenance: () => `/api/maintenance`,

  // Workshop APIs (Phase 4)
  workshopJobs: () => `/api/workshop/jobs`,
  workshopJob: (id: string) => `/api/workshop/jobs/${id}`,
  workshopJobUpdate: (id: string) => `/api/workshop/jobs/${id}/updates`,
  workshopRefund: (paymentId: string) => `/api/workshop/payments/${paymentId}/refund`,

  // Admin APIs (Phase 4)
  adminQuotes: () => `/api/admin/quotes`,
  adminQuote: (id: string) => `/api/admin/quotes/${id}`,
  adminRfqBids: () => `/api/admin/rfq/bids`,
  adminJobs: () => `/api/admin/jobs`,
  adminJob: (id: string) => `/api/admin/jobs/${id}`,
  adminPayments: () => `/api/admin/payments`,
  adminPayment: (id: string) => `/api/admin/payments/${id}`,
  adminEscrowRelease: (paymentId: string) => `/api/admin/payments/${paymentId}/release`,
  adminRefunds: () => `/api/admin/refunds`,
  adminRefund: (paymentId: string) => `/api/admin/refunds/${paymentId}`,

  // Analytics (Phase 5)
  analytics: () => `/api/analytics`,
  metrics: () => `/api/metrics`,
}

/**
 * Deep link helpers for notifications and emails
 *
 * These generate full URLs with context for direct navigation
 */
export const deepLinkFor = {
  sessionCompleted: (sessionId: string) => routeFor.sessionReport(sessionId),
  summaryReady: (sessionId: string) => routeFor.sessionReport(sessionId),
  quoteReceived: (quoteId: string) => routeFor.quote(quoteId),
  rfqBidsReady: (rfqId: string) => routeFor.rfqBids(rfqId),
  repairUpdate: (repairId: string) => routeFor.repair(repairId),
  paymentRequired: (type: 'quote' | 'rfq', id: string) =>
    type === 'quote' ? routeFor.quote(id) : routeFor.rfqBids(id),
  maintenanceReminder: () => routeFor.maintenance(),
  referralReward: () => routeFor.referrals(),

  // Phase 4: Unified System
  offerReceived: (offerId: string, source: 'direct' | 'rfq') => routeFor.offerDetail(offerId, source),
  offersReady: (sessionId?: string) => routeFor.quotesAndJobs(sessionId ? { sessionId } : undefined),
  jobUpdate: (jobId: string) => routeFor.job(jobId),
  jobApprovalRequired: (jobId: string) => routeFor.job(jobId),
  jobReadyForPickup: (jobId: string) => routeFor.job(jobId),
  jobCompleted: (jobId: string) => routeFor.job(jobId),
}

/**
 * Email template URLs (for Resend templates in Phase 3)
 */
export const emailLinkFor = {
  sessionReport: (sessionId: string, baseUrl: string) =>
    `${baseUrl}${routeFor.sessionReport(sessionId)}`,

  viewQuotes: (sessionId: string, baseUrl: string) =>
    `${baseUrl}${routeFor.rfqCreate({ session_id: sessionId, prefill: true })}`,

  acceptQuote: (quoteId: string, baseUrl: string) =>
    `${baseUrl}${routeFor.quote(quoteId)}`,

  viewRepair: (repairId: string, baseUrl: string) =>
    `${baseUrl}${routeFor.repair(repairId)}`,

  dashboard: (baseUrl: string) =>
    `${baseUrl}${routeFor.customerDashboard()}`,
}

/**
 * Type-safe route parameters
 */
export type RouteParams = {
  sessionId?: string
  quoteId?: string
  rfqId?: string
  repairId?: string
  vehicleId?: string
}

/**
 * Helper to build query params
 */
export function buildQueryString(params: Record<string, string | boolean | number | undefined>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value))
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

/**
 * Helper to extract base URL from environment
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}
