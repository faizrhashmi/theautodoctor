'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogoutPage() {
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        await fetch('/api/admin/logout', { method: 'POST' })
      } finally {
        router.replace('/admin/login')
      }
    })()
  }, [router])

  return (
    <main className="mx-auto max-w-sm px-6 py-20 text-center">
      <p className="text-sm text-slate-600">Signing you out…</p>
    </main>
  )
}
