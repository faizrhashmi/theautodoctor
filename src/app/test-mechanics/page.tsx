'use client'

import { useEffect, useState } from 'react'

export default function TestMechanicsPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signupEmail, setSignupEmail] = useState('test@mechanic.com')
  const [signupPassword, setSignupPassword] = useState('testpassword123')
  const [loginEmail, setLoginEmail] = useState('test@mechanic.com')
  const [loginPassword, setLoginPassword] = useState('testpassword123')

  useEffect(() => {
    checkTables()
  }, [])

  const checkTables = async () => {
    try {
      const res = await fetch('/api/test/check-mechanics-tables')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  const testSignup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mechanics/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Mechanic',
          email: signupEmail,
          password: signupPassword,
          phone: '555-1234',
        }),
      })
      const data = await res.json()
      setStatus({
        ...status,
        signupResult: {
          status: res.status,
          data,
        },
      })
      // Refresh table check
      await checkTables()
    } catch (error) {
      setStatus({
        ...status,
        signupResult: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const testLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/mechanics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })
      const data = await res.json()
      setStatus({
        ...status,
        loginResult: {
          status: res.status,
          data,
        },
      })
    } catch (error) {
      setStatus({
        ...status,
        loginResult: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const testPassword = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/test/mechanic-password-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })
      const data = await res.json()
      setStatus({
        ...status,
        passwordTest: {
          status: res.status,
          data,
        },
      })
    } catch (error) {
      setStatus({
        ...status,
        passwordTest: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !status) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">Mechanics Table Test</h1>

        {/* Table Status */}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-semibold mb-2">Database Tables Status:</h2>
          <pre className="bg-slate-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>

        {/* Signup Test */}
        <div className="rounded-lg border border-blue-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Test Signup</h2>
          <div className="space-y-3">
            <input
              type="email"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded border px-3 py-2"
            />
            <input
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded border px-3 py-2"
            />
            <button
              onClick={testSignup}
              disabled={loading}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Signup'}
            </button>
          </div>
        </div>

        {/* Login Test */}
        <div className="rounded-lg border border-green-200 bg-white p-6">
          <h2 className="font-semibold mb-4">Test Login</h2>
          <div className="space-y-3">
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded border px-3 py-2"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded border px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                onClick={testPassword}
                disabled={loading}
                className="flex-1 rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Password'}
              </button>
              <button
                onClick={testLogin}
                disabled={loading}
                className="flex-1 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Login'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={checkTables}
            disabled={loading}
            className="rounded bg-slate-600 px-6 py-3 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            Refresh Table Status
          </button>
        </div>
      </div>
    </div>
  )
}
