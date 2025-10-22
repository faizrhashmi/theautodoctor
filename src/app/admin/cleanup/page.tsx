'use client'

import { useState, useEffect } from 'react'

interface CleanupStats {
  expiredRequests: number
  oldWaitingSessions: number
  potentialOrphans: number
  total: number
}

export default function CleanupAdminPage() {
  const [stats, setStats] = useState<CleanupStats | null>(null)
  const [output, setOutput] = useState<string>('Click "Check Stats" to get started...')
  const [loading, setLoading] = useState(false)

  async function checkStats() {
    setOutput('Checking cleanup stats...')
    setLoading(true)

    try {
      const res = await fetch('/api/debug/cleanup-sessions')
      const data = await res.json()

      if (res.ok && data.wouldClean) {
        setStats(data.wouldClean)
        setOutput(JSON.stringify(data, null, 2))

        if (data.wouldClean.total === 0) {
          setOutput((prev) => prev + '\n\n✅ No cleanup needed - all sessions are healthy!')
        } else {
          setOutput((prev) => prev + '\n\n⚠️ Click "Run Cleanup" to clean these up.')
        }
      } else {
        setOutput(JSON.stringify(data, null, 2))
      }
    } catch (error: any) {
      setOutput('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function runCleanup() {
    if (!confirm('Are you sure you want to run cleanup? This will cancel stale sessions and requests.')) {
      return
    }

    setOutput('Running cleanup...')
    setLoading(true)

    try {
      const res = await fetch('/api/debug/cleanup-sessions', {
        method: 'POST',
      })

      const data = await res.json()
      setOutput(JSON.stringify(data, null, 2))

      if (res.ok) {
        if (data.stats.totalCleaned > 0) {
          setOutput(
            (prev) =>
              prev +
              `\n\n✅ Successfully cleaned up ${data.stats.totalCleaned} items!\n\n` +
              `- Expired Requests: ${data.stats.expiredRequests}\n` +
              `- Old Waiting Sessions: ${data.stats.oldWaitingSessions}\n` +
              `- Orphaned Sessions: ${data.stats.orphanedSessions}`
          )

          // Refresh stats
          setTimeout(checkStats, 1000)
        } else {
          setOutput((prev) => prev + '\n\n✅ No cleanup was needed - all sessions are healthy!')
        }
      }
    } catch (error: any) {
      setOutput('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load stats on mount
  useEffect(() => {
    checkStats()
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <div style={{ background: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 20px 0' }}>🧹 Session Cleanup Admin Tool</h1>

        <div
          style={{
            background: '#dbeafe',
            border: '1px solid #3b82f6',
            padding: '15px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          <strong>ℹ️ About:</strong> This tool helps you clean up stale sessions and requests that might be blocking customers.
          It uses the centralized cleanup utility with built-in safety checks.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            margin: '20px 0',
          }}
        >
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '2px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Expired Requests</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {stats?.expiredRequests ?? '-'}
            </div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '2px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Old Waiting Sessions</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {stats?.oldWaitingSessions ?? '-'}
            </div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '2px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Orphaned Sessions</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
              {stats?.potentialOrphans ?? '-'}
            </div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '2px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#6b7280' }}>Total to Clean</h3>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>{stats?.total ?? '-'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
          <button
            onClick={checkStats}
            disabled={loading}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1,
            }}
          >
            📊 Check Stats
          </button>
          <button
            onClick={runCleanup}
            disabled={loading}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: loading ? 0.6 : 1,
            }}
          >
            🧹 Run Cleanup
          </button>
        </div>

        <pre
          style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            fontSize: '13px',
            maxHeight: '500px',
            overflowY: 'auto',
            marginTop: '20px',
          }}
        >
          {output}
        </pre>
      </div>
    </div>
  )
}
