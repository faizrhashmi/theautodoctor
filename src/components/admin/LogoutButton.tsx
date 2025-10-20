'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear client-side auth tokens
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
      
      // Force hard redirect to login (bypasses React Router)
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect even if error
      window.location.href = '/admin/login'
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}