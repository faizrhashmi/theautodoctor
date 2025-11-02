'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, RefreshCw, Database, HardDrive, Check, X } from 'lucide-react'

export default function EmergencyAdminPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [storageStats, setStorageStats] = useState<any>(null)

  const checkDatabaseCounts = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/clear-all-sessions')
      const data = await response.json()
      setResult(data)
    } catch (error: unknown) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const clearDatabase = async () => {
    const confirmed = window.confirm(
      '⚠️ NUCLEAR OPTION ⚠️\n\n' +
      'This will PERMANENTLY DELETE:\n' +
      '• ALL session requests\n' +
      '• ALL active sessions\n' +
      '• ALL session history\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Type "DELETE" in the next prompt to confirm.'
    )

    if (!confirmed) return

    const confirmText = window.prompt('Type DELETE to confirm:')
    if (confirmText !== 'DELETE') {
      alert('Cancelled. You must type DELETE exactly.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/clear-all-sessions', {
        method: 'DELETE'
      })
      const data = await response.json()
      setResult(data)
      alert(`✅ Success! Deleted ${data.summary?.total_deleted || 0} records`)
    } catch (error: unknown) {
      setResult({ error: error.message })
      alert('❌ Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const checkLocalStorage = () => {
    const stats = {
      localStorage: {
        count: localStorage.length,
        keys: Object.keys(localStorage)
      },
      sessionStorage: {
        count: sessionStorage.length,
        keys: Object.keys(sessionStorage)
      },
      cookies: {
        count: document.cookie.split(';').filter(c => c.trim()).length,
        items: document.cookie.split(';').map(c => c.trim().split('=')[0])
      }
    }
    setStorageStats(stats)
  }

  const clearLocalStorage = () => {
    const confirmed = window.confirm(
      '⚠️ WARNING ⚠️\n\n' +
      'This will clear ALL browser storage:\n' +
      '• LocalStorage\n' +
      '• SessionStorage\n' +
      '• Cookies\n\n' +
      'Continue?'
    )

    if (!confirmed) return

    localStorage.clear()
    sessionStorage.clear()

    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim()
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    })

    alert('✅ Browser storage cleared!')
    checkLocalStorage()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 bg-red-500/20 border-2 border-red-500 rounded-full px-6 py-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
            <h1 className="text-2xl font-bold text-red-400">EMERGENCY ADMIN PANEL</h1>
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <p className="text-slate-400">Nuclear options for clearing all session data</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Database Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Database className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Database Cleanup</h2>
                <p className="text-sm text-slate-400">Clear SQL sessions & requests</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={checkDatabaseCounts}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Checking...' : 'Check Database Counts'}
              </button>

              <button
                onClick={clearDatabase}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                🔥 DELETE ALL SESSIONS (NUCLEAR)
              </button>
            </div>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border-2 ${
                result.error
                  ? 'bg-red-500/10 border-red-500'
                  : result.success
                  ? 'bg-green-500/10 border-green-500'
                  : 'bg-blue-500/10 border-blue-500'
              }`}>
                <div className="flex items-start gap-2 mb-2">
                  {result.error ? (
                    <X className="w-5 h-5 text-red-400 flex-shrink-0" />
                  ) : result.success ? (
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : null}
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      result.error ? 'text-red-400' : result.success ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      {result.message || result.error || 'Database Info'}
                    </p>
                  </div>
                </div>
                <pre className="text-xs bg-slate-900/50 p-3 rounded overflow-x-auto text-slate-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Browser Storage Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <HardDrive className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Browser Storage</h2>
                <p className="text-sm text-slate-400">Clear local cache & cookies</p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={checkLocalStorage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Check Browser Storage
              </button>

              <button
                onClick={clearLocalStorage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Clear Browser Storage
              </button>
            </div>

            {storageStats && (
              <div className="mt-4 p-4 rounded-lg border-2 bg-blue-500/10 border-blue-500">
                <p className="font-semibold text-blue-400 mb-2">Browser Storage Stats:</p>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-slate-900/50 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">{storageStats.localStorage.count}</div>
                    <div className="text-xs text-slate-400">LocalStorage</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">{storageStats.sessionStorage.count}</div>
                    <div className="text-xs text-slate-400">SessionStorage</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">{storageStats.cookies.count}</div>
                    <div className="text-xs text-slate-400">Cookies</div>
                  </div>
                </div>
                <pre className="text-xs bg-slate-900/50 p-3 rounded overflow-x-auto text-slate-300">
                  {JSON.stringify(storageStats, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* SQL Commands Reference */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">📋 Manual SQL Commands</h2>
          <p className="text-sm text-slate-400 mb-4">
            If APIs fail, use these commands directly in Supabase SQL Editor:
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">1. Delete all session requests:</p>
              <pre className="bg-slate-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
                DELETE FROM session_requests;
              </pre>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">2. Delete all sessions:</p>
              <pre className="bg-slate-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
                DELETE FROM sessions;
              </pre>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">3. Nuclear option (both at once):</p>
              <pre className="bg-slate-900 p-4 rounded-lg text-red-400 text-sm overflow-x-auto">
{`-- ⚠️ DANGER: Deletes everything
DELETE FROM session_requests;
DELETE FROM sessions;

-- Verify deletion
SELECT COUNT(*) FROM session_requests;
SELECT COUNT(*) FROM sessions;`}
              </pre>
            </div>
          </div>
        </div>

        {/* Warning Footer */}
        <div className="mt-8 p-6 bg-yellow-500/10 border-2 border-yellow-500 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-yellow-400 mb-2">⚠️ IMPORTANT WARNINGS</h3>
              <ul className="text-sm text-yellow-200 space-y-1 list-disc list-inside">
                <li>These actions are PERMANENT and CANNOT be undone</li>
                <li>All customers will lose their active sessions</li>
                <li>All mechanics will lose their pending requests</li>
                <li>Session history will be DELETED forever</li>
                <li>Use only in emergency or development environments</li>
                <li>Always create a backup before using these tools</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
