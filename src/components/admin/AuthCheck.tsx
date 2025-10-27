'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * Client-side authentication check for admin pages
 * ⚠️ DEPRECATED: Use ServerAuthCheck instead for better security
 * This component is kept for backward compatibility
 *
 * @deprecated Use ServerAuthCheck instead
 */
export function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAdminRole() {
      try {
        const supabase = createClient()

        // ✅ SECURITY FIX: Actually verify with server
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.warn('[SECURITY] No authenticated user - redirecting to login')
          router.push('/admin/login')
          return
        }

        // ✅ SECURITY FIX: Check role from database
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('[AUTH ERROR]', profileError)
          router.push('/admin/login')
          return
        }

        if (!profile || profile.role !== 'admin') {
          console.warn(`[SECURITY] Non-admin user ${user.email} attempted to access admin panel`)
          router.push('/')
          return
        }

        setIsAdmin(true)
      } catch (error) {
        console.error('[AUTH ERROR]', error)
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }

    checkAdminRole()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-slate-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  return isAdmin ? <>{children}</> : null
}