import { requireAdmin } from '@/lib/auth/guards'

/**
 * Server-side authentication check for admin pages
 * Redirects unauthorized users to login page
 *
 * P0-4 FIX: Updated to use centralized guards from @/lib/auth/guards
 * (Previously used deprecated @/lib/auth/requireAdmin)
 *
 * Usage in admin layout:
 * <ServerAuthCheck>
 *   <AdminContent />
 * </ServerAuthCheck>
 */
export async function ServerAuthCheck({ children }: { children: React.ReactNode }) {
  // requireAdmin from guards.ts will redirect unauthorized users automatically
  await requireAdmin()

  return <>{children}</>
}
