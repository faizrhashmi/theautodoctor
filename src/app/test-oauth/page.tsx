'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TestOAuth() {
  const [status, setStatus] = useState<string>('Ready to test')
  const [providers, setProviders] = useState<any>(null)
  const supabase = createClient()

  const checkProviders = async () => {
    setStatus('Checking available providers...')

    try {
      // Try to get session info which might tell us about providers
      const { data: { session }, error } = await supabase.auth.getSession()

      setStatus('Attempting Google OAuth...')

      // Try Google OAuth
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (oauthError) {
        setStatus(`❌ Error: ${oauthError.message}`)
        setProviders({ error: oauthError })
      } else {
        setStatus('✅ Google OAuth is configured! Redirecting...')
        setProviders({ success: true, data })
      }
    } catch (err: any) {
      setStatus(`❌ Error: ${err.message}`)
      setProviders({ error: err })
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">OAuth Configuration Test</h1>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Test Google OAuth</h2>

          <button
            onClick={checkProviders}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            Test Google OAuth
          </button>

          <div className="mt-6 p-4 bg-slate-900 rounded border border-slate-700">
            <p className="text-white font-mono text-sm">{status}</p>
          </div>
        </div>

        {providers && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-3">Response:</h3>
            <pre className="text-xs text-slate-300 overflow-auto">
              {JSON.stringify(providers, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 bg-orange-900/20 border border-orange-500/50 rounded-lg p-4">
          <h3 className="text-orange-400 font-semibold mb-2">Instructions:</h3>
          <ol className="text-orange-200 text-sm space-y-2">
            <li>1. Click "Test Google OAuth" button above</li>
            <li>2. If you see "provider is not enabled" - Google needs to be enabled in Supabase</li>
            <li>3. If you get redirected to Google - it's working!</li>
          </ol>
        </div>

        <div className="mt-6">
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            ← Back to Login
          </a>
        </div>
      </div>
    </div>
  )
}
