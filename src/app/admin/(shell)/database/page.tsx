// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'

interface SavedQuery {
  id: string
  name: string
  description?: string
  query: string
  category: string
}

interface QueryHistory {
  id: string
  query: string
  execution_time_ms: number
  rows_returned: number
  success: boolean
  error_message?: string
  executed_at: string
}

export default function DatabasePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [queryName, setQueryName] = useState('')
  const [queryDescription, setQueryDescription] = useState('')
  const [queryCategory, setQueryCategory] = useState('custom')
  const [activeTab, setActiveTab] = useState<'results' | 'history' | 'saved'>('results')

  useEffect(() => {
    fetchSavedQueries()
    fetchQueryHistory()
  }, [])

  const fetchSavedQueries = async () => {
    try {
      const response = await fetch('/api/admin/database/saved-queries')
      const data = await response.json()
      setSavedQueries(data)
    } catch (error) {
      console.error('Failed to fetch saved queries:', error)
    }
  }

  const fetchQueryHistory = async () => {
    try {
      const response = await fetch('/api/admin/database/history')
      const data = await response.json()
      setQueryHistory(data)
    } catch (error) {
      console.error('Failed to fetch query history:', error)
    }
  }

  const executeQuery = async () => {
    if (!query.trim()) return

    setLoading(true)
    setResults(null)

    try {
      const response = await fetch('/api/admin/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (!response.ok) {
        return
      }

      setResults(data)
      fetchQueryHistory() // Refresh history
      setActiveTab('results')
    } catch (err: any) {
      } finally {
      setLoading(false)
    }
  }

  const saveQuery = async () => {
    if (!queryName.trim()) {
      alert('Please enter a query name')
      return
    }

    try {
      const response = await fetch('/api/admin/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          save: true,
          name: queryName,
          description: queryDescription,
          category: queryCategory,
        }),
      })

      if (response.ok) {
        setShowSaveDialog(false)
        setQueryName('')
        setQueryDescription('')
        setQueryCategory('custom')
        fetchSavedQueries()
        alert('Query saved successfully!')
      }
    } catch (error) {
      console.error('Failed to save query:', error)
      alert('Failed to save query')
    }
  }

  const loadSavedQuery = (savedQuery: SavedQuery) => {
    setQuery(savedQuery.query)
  }

  const loadHistoryQuery = (historyItem: QueryHistory) => {
    setQuery(historyItem.query)
  }

  const exportResults = (format: 'json' | 'csv') => {
    if (!results?.data) return

    if (format === 'json') {
      const dataStr = JSON.stringify(results.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `query-results-${new Date().toISOString()}.json`
      link.click()
    } else if (format === 'csv') {
      if (results.data.length === 0) return

      const headers = Object.keys(results.data[0])
      const csvRows = [
        headers.join(','),
        ...results.data.map((row: any) =>
          headers.map(header => JSON.stringify(row[header] ?? '')).join(',')
        ),
      ]
      const csvStr = csvRows.join('\n')
      const dataBlob = new Blob([csvStr], { type: 'text/csv' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `query-results-${new Date().toISOString()}.csv`
      link.click()
    }
  }

  const categories = Array.from(new Set(savedQueries.map(q => q.category)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Query Tool</h1>
          <p className="text-sm text-gray-600 mt-1">Execute read-only SQL queries safely</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-yellow-100 border border-yellow-200 rounded-lg">
            <span className="text-xs font-medium text-yellow-800">READ-ONLY MODE</span>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Safety First</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Only SELECT, SHOW, DESCRIBE, and EXPLAIN queries are allowed. Write operations are blocked for safety.
            </p>
          </div>
        </div>
      </div>

      {/* Query Editor */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">SQL Query Editor</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={!query.trim()}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Save Query
            </button>
            <button
              onClick={() => setQuery('')}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SELECT * FROM sessions WHERE status = 'active' LIMIT 10"
          className="w-full h-64 p-4 font-mono text-sm focus:outline-none resize-none"
          spellCheck={false}
        />
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {query.trim() ? `${query.split('\n').length} lines, ${query.length} characters` : 'Enter your SQL query'}
          </div>
          <button
            onClick={executeQuery}
            disabled={loading || !query.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>

      {/* Results/History/Saved Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('results')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'results'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Results
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              History ({queryHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'saved'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Saved Queries ({savedQueries.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Results Tab */}
          {activeTab === 'results' && (
            <div>
              {results && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Rows: {results.rowCount}</span>
                      <span>Execution Time: {results.executionTime}ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportResults('json')}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={() => exportResults('csv')}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    {Array.isArray(results.data) && results.data.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(results.data[0]).map((header) => (
                              <th key={header} className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.data.map((row: any, index: number) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {Object.values(row).map((value: any, i: number) => (
                                <td key={i} className="px-4 py-2 border-b border-gray-200">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        {results.data ? 'Query returned no results' : 'Execute a query to see results'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!results && !loading && (
                <div className="text-center py-12 text-gray-500">
                  Execute a query to see results here
                </div>
              )}

              {loading && (
                <div className="text-center py-12 text-gray-500">
                  Executing query...
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {queryHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No query history</div>
              ) : (
                queryHistory.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <pre className="text-sm font-mono text-gray-900 whitespace-pre-wrap">
                          {item.query.substring(0, 200)}{item.query.length > 200 ? '...' : ''}
                        </pre>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(item.executed_at).toLocaleString()}</span>
                          <span>{item.execution_time_ms}ms</span>
                          <span>{item.rows_returned} rows</span>
                          {item.success ? (
                            <span className="text-green-600">Success</span>
                          ) : (
                            <span className="text-red-600">Failed: {item.error_message}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => loadHistoryQuery(item)}
                        className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Saved Queries Tab */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase">{category}</h3>
                  <div className="space-y-2">
                    {savedQueries
                      .filter((q) => q.category === category)
                      .map((savedQuery) => (
                        <div key={savedQuery.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{savedQuery.name}</h4>
                              {savedQuery.description && (
                                <p className="text-sm text-gray-600 mt-1">{savedQuery.description}</p>
                              )}
                              <pre className="text-xs font-mono text-gray-500 mt-2 whitespace-pre-wrap">
                                {savedQuery.query.substring(0, 150)}{savedQuery.query.length > 150 ? '...' : ''}
                              </pre>
                            </div>
                            <button
                              onClick={() => loadSavedQuery(savedQuery)}
                              className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              Load
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Save Query</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Query Name</label>
                <input
                  type="text"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                  placeholder="My Saved Query"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={queryDescription}
                  onChange={(e) => setQueryDescription(e.target.value)}
                  placeholder="What does this query do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={queryCategory}
                  onChange={(e) => setQueryCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="custom">Custom</option>
                  <option value="sessions">Sessions</option>
                  <option value="users">Users</option>
                  <option value="payments">Payments</option>
                  <option value="analytics">Analytics</option>
                  <option value="database">Database</option>
                </select>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveQuery}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Save Query
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
