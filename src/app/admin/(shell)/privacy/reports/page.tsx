'use client'

import { useState } from 'react'

export default function PrivacyReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)

  // Report parameters
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 1)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const generateReport = async (reportType: string) => {
    try {
      setGenerating(reportType)
      setReportData(null)

      const response = await fetch(`/api/admin/privacy/reports/${reportType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate ${reportType} report`)
      }

      const data = await response.json()
      setReportData(data)
    } catch (err) {
      alert('Error generating report: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setGenerating(null)
    }
  }

  const downloadPDF = async (reportType: string) => {
    try {
      setGenerating(reportType + '-pdf')

      const response = await fetch(`/api/admin/privacy/reports/${reportType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_from: dateFrom, date_to: dateTo }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate ${reportType} PDF`)
      }

      // Get the PDF blob
      const blob = await response.blob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      alert('PDF report downloaded successfully!')
    } catch (err) {
      alert('Error generating PDF: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setGenerating(null)
    }
  }

  const downloadReport = (format: 'json' | 'csv') => {
    if (!reportData) return

    const filename = `privacy_report_${reportData.report_type}_${new Date().toISOString().split('T')[0]}.${format}`

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } else if (format === 'csv') {
      // Simple CSV conversion (would need proper library for complex data)
      const csv = convertToCSV(reportData)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Privacy Compliance Reports</h1>
        <p className="text-slate-400 mt-1">Generate PIPEDA & CASL compliance reports</p>
      </div>

      {/* Date Range Selector */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Report Date Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PIPEDA Compliance Report */}
        <ReportCard
          title="PIPEDA Compliance Report"
          description="Comprehensive report on privacy compliance including consent management, data access requests, and breach incidents."
          icon="🇨🇦"
          metrics={[
            'Overall compliance score',
            'Customer consent statistics',
            'Data access requests (30-day tracking)',
            'Account deletion requests',
            'Data breach incidents',
            'Privacy policy updates',
          ]}
          onGenerate={() => generateReport('pipeda')}
          onDownloadPDF={() => downloadPDF('pipeda')}
          isGenerating={generating === 'pipeda' || generating === 'pipeda-pdf'}
        />

        {/* CASL Compliance Report */}
        <ReportCard
          title="CASL Compliance Report"
          description="Canada's Anti-Spam Legislation compliance report for marketing communications."
          icon="📧"
          metrics={[
            'Marketing consent opt-in rates',
            'Consent withdrawal tracking',
            'Email marketing statistics',
            'SMS notification consents',
            'Unsubscribe rate analysis',
            'Consent collection methods',
          ]}
          onGenerate={() => generateReport('casl')}
          onDownloadPDF={() => downloadPDF('casl')}
          isGenerating={generating === 'casl' || generating === 'casl-pdf'}
        />

        {/* Data Access Report */}
        <ReportCard
          title="Data Access Request Report"
          description="PIPEDA 30-day compliance tracking for customer data access requests."
          icon="📋"
          metrics={[
            'Total requests in period',
            'Requests completed on time',
            'Overdue requests',
            'Average response time',
            'Request fulfillment rate',
          ]}
          onGenerate={() => generateReport('data-access')}
          isGenerating={generating === 'data-access'}
        />

        {/* Audit Log Summary */}
        <ReportCard
          title="Privacy Audit Log Summary"
          description="Summary of all privacy-related events and administrative actions."
          icon="📜"
          metrics={[
            'Total privacy events',
            'Events by type',
            'Admin access to customer data',
            'Data exports',
            'System access patterns',
          ]}
          onGenerate={() => generateReport('audit-summary')}
          isGenerating={generating === 'audit-summary'}
        />

        {/* Workshop Compliance Report */}
        <ReportCard
          title="Workshop Compliance Report"
          description="Workshop agreement and insurance compliance tracking."
          icon="🔧"
          metrics={[
            'Total workshops monitored',
            'Active agreements',
            'Insurance compliance',
            'Expiring insurance alerts',
            'Non-compliant workshops',
          ]}
          onGenerate={() => generateReport('workshop')}
          isGenerating={generating === 'workshop'}
        />

        {/* Consent Version Report */}
        <ReportCard
          title="Consent Version Report"
          description="Track customers using outdated consent versions."
          icon="📄"
          metrics={[
            'Customers on latest version',
            'Outdated consent versions',
            'Version update timeline',
            'Re-consent requirements',
          ]}
          onGenerate={() => generateReport('consent-versions')}
          isGenerating={generating === 'consent-versions'}
        />
      </div>

      {/* Generated Report Display */}
      {reportData && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Generated Report</h2>
              <p className="text-sm text-slate-400 mt-1">
                {reportData.report_title} • Generated {new Date(reportData.generated_at).toLocaleString('en-CA')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => downloadReport('json')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Download JSON
              </button>
              <button
                onClick={() => downloadReport('csv')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Download CSV
              </button>
            </div>
          </div>

          {/* Report Summary */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">Report Summary</h3>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap">
              {JSON.stringify(reportData.summary || reportData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Report Usage Guidelines */}
      <div className="bg-blue-500/10 border border-blue-500 rounded-xl p-6">
        <h3 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <span>ℹ️</span>
          Report Usage Guidelines
        </h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>• <strong>PIPEDA Compliance Report:</strong> Submit quarterly to Privacy Commissioner or use for internal audits</li>
          <li>• <strong>CASL Report:</strong> Maintain records for 3 years as required by CASL regulations</li>
          <li>• <strong>Data Access Report:</strong> Track compliance with PIPEDA 30-day requirement</li>
          <li>• <strong>Audit Log:</strong> Keep for legal compliance and security investigations</li>
          <li>• <strong>Workshop Compliance:</strong> Monitor insurance and agreement status</li>
          <li>• All reports can be exported as JSON or CSV for further analysis</li>
        </ul>
      </div>
    </div>
  )
}

// Report Card Component
function ReportCard({
  title,
  description,
  icon,
  metrics,
  onGenerate,
  onDownloadPDF,
  isGenerating,
}: {
  title: string
  description: string
  icon: string
  metrics: string[]
  onGenerate: () => void
  onDownloadPDF?: () => void
  isGenerating: boolean
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Includes:</h4>
        <ul className="space-y-1">
          {metrics.map((metric, index) => (
            <li key={index} className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>{metric}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Generating...
            </span>
          ) : (
            'Generate Report'
          )}
        </button>
        {onDownloadPDF && (
          <button
            onClick={onDownloadPDF}
            disabled={isGenerating}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            title="Download PDF Report"
          >
            📄 PDF
          </button>
        )}
      </div>
    </div>
  )
}

// Simple CSV converter (basic implementation)
function convertToCSV(data: Record<string, unknown>): string {
  if (!data || !data.summary) return ''

  const summary = data.summary
  const rows = []

  // Add header
  rows.push('Metric,Value')

  // Add summary data
  Object.entries(summary).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      rows.push(`${key},${JSON.stringify(value)}`)
    } else {
      rows.push(`${key},${value}`)
    }
  })

  return rows.join('\n')
}
