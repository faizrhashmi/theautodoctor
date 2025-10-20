'use client'

import { useEffect, useState } from 'react'

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Simple check for auth tokens
    const checkAuth = () => {
      const hasAuth = 
        localStorage.getItem('supabase.auth.token') ||
        sessionStorage.getItem('supabase.auth.token') ||
        document.cookie.includes('sb-')
      
      setIsAuthenticated(!!hasAuth)
    }
    
    checkAuth()
    
    // Optional: Check auth when storage changes
    const handleStorageChange = () => checkAuth()
    window.addEventListener('storage', handleStorageChange)
    
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Don't render until we know auth status to avoid flash
  if (!mounted) {
    return null
  }

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null
}