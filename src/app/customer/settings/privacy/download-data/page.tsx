'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Download, FileJson, FileText, Shield, Clock, Check, AlertTriangle } from 'lucide-react'

export default function DownloadDataPage() {
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  async function handleDownload() {
    try {
      setDownloading(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/customer/privacy/download-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to download data')
      }

      // Get the blob from response
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setSuccessMessage('Your data has been downloaded successfully!')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to download data')
      setTimeout(() => setError(null), 5000)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Download className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Download My Data</h1>
              <p className="text-sm text-slate-400 mt-1">PIPEDA: Right to Access Your Personal Information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/customer/settings/privacy"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-6"
        >
          ← Back to Privacy Settings
        </Link>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-400" />
              <p className="text-sm text-green-200">{successMessage}</p>
            </div>
          </div>
        )}

        {/* PIPEDA Information */}
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-blue-400 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-blue-200 mb-2">Your Right to Access (PIPEDA Principle 9)</h2>
              <p className="text-sm text-blue-300/90 leading-relaxed">
                Under Canada's PIPEDA, you have the right to access your personal information held by The Auto Doctor Inc.
                We provide this data in a structured, commonly used format that you can download and review.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-400/80">
                <Clock className="h-4 w-4" />
                <span>Response time: Immediate (PIPEDA requires 30 days maximum)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm p-8">
          <h2 className="text-xl font-bold text-white mb-6">Select Download Format</h2>

          {/* Format Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* JSON Option */}
            <button
              onClick={() => setFormat('json')}
              className={`p-6 rounded-lg border-2 transition text-left ${
                format === 'json'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <FileJson className={`h-6 w-6 ${format === 'json' ? 'text-blue-400' : 'text-slate-400'}`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">JSON Format</h3>
                  <p className="text-sm text-slate-400">Structured data format ideal for developers</p>
                </div>
                {format === 'json' && <Check className="h-5 w-5 text-blue-400" />}
              </div>
              <div className="text-xs text-slate-500">
                • Complete data export<br />
                • Machine-readable<br />
                • Easy to import into other systems
              </div>
            </button>

            {/* CSV Option */}
            <button
              onClick={() => setFormat('csv')}
              className={`p-6 rounded-lg border-2 transition text-left ${
                format === 'csv'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <FileText className={`h-6 w-6 ${format === 'csv' ? 'text-blue-400' : 'text-slate-400'}`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">CSV Format</h3>
                  <p className="text-sm text-slate-400">Spreadsheet format for easy viewing</p>
                </div>
                {format === 'csv' && <Check className="h-5 w-5 text-blue-400" />}
              </div>
              <div className="text-xs text-slate-500">
                • Human-readable<br />
                • Open in Excel/Google Sheets<br />
                • Basic profile and vehicle data
              </div>
            </button>
          </div>

          {/* What's Included */}
          <div className="mb-8 p-6 rounded-lg border border-slate-700 bg-slate-900/50">
            <h3 className="font-semibold text-white mb-4">What's Included in Your Download</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Profile information</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Vehicle details</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Diagnostic sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Quotes and estimates</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Payment history (redacted)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Reviews and ratings</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Privacy consents</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>Chat messages</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Note: Sensitive payment information (card numbers, etc.) is redacted for security. Encrypted passwords are excluded.
              </p>
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Preparing Download...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download My Data ({format.toUpperCase()})
              </>
            )}
          </button>

          {/* Privacy Notice */}
          <div className="mt-6 p-4 rounded-lg bg-slate-900/50 border border-slate-700">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Privacy Notice:</strong> This download will be logged in our privacy audit trail
              for compliance purposes. The exported file contains your personal information - please store it securely and delete
              it when no longer needed. If you have questions about your data, contact{' '}
              <a href="mailto:privacy@theautodoctor.ca" className="text-blue-400 hover:text-blue-300">
                privacy@theautodoctor.ca
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
