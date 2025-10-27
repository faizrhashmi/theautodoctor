import { redirect } from 'next/navigation'
import { requireAdminServerComponent } from '@/lib/auth/requireAdmin'

/**
 * Server-side authentication check for admin pages
 * Redirects unauthorized users to login page
 *
 * Usage in admin layout:
 * <ServerAuthCheck>
 *   <AdminContent />
 * </ServerAuthCheck>
 */
export async function ServerAuthCheck({ children }: { children: React.ReactNode }) {
  const auth = await requireAdminServerComponent()

  if (!auth.authorized) {
    console.warn('[SECURITY] Unauthorized access attempt to admin page - redirecting to login')
    redirect('/admin/login')
  }

  return <>{children}</>
}
