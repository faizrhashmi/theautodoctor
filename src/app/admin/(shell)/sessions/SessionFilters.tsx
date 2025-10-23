// @ts-nocheck
'use client'

import { useState } from 'react'
import type { Filters } from './AdminSessionsClient'

type Props = {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  onExport: (format: 'csv' | 'json') => void
  onBulkCancel: () => void
  selectedCount: number
}

export default function SessionFilters({
  filters,
  onFiltersChange,
  onExport,
  onBulkCancel,
  selectedCount,
}: Props) {
  const [showExportMenu, setShowExportMenu] = useState(false)

  return (
    <div className="border-b border-slate-200 p-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Status Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="all">All Statuses</option>
            <option value="live">Live</option>
            <option value="waiting">Waiting</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
            <option value="unattended">Unattended</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Type</label>
          <select
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="all">All Types</option>
            <option value="chat">Chat</option>
            <option value="video">Video</option>
            <option value="diagnostic">Diagnostic</option>
          </select>
        </div>

        {/* Search */}
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-700">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Session ID, customer name, email..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Date From</label>
          <input
            type="date"
            value={filters.dateRange?.from || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                dateRange: e.target.value
                  ? { from: e.target.value, to: filters.dateRange?.to || e.target.value }
                  : null,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <>
              <span className="text-sm font-medium text-slate-700">
                {selectedCount} selected
              </span>
              <button
                onClick={onBulkCancel}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Cancel Selected
              </button>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export
            <svg
              className="ml-2 inline-block h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full z-10 mt-2 w-40 rounded-lg border border-slate-200 bg-white shadow-lg">
              <button
                onClick={() => {
                  onExport('csv')
                  setShowExportMenu(false)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => {
                  onExport('json')
                  setShowExportMenu(false)
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                Export as JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clear Filters */}
      {(filters.status !== 'all' ||
        filters.type !== 'all' ||
        filters.search ||
        filters.dateRange) && (
        <button
          onClick={() =>
            onFiltersChange({
              status: 'all',
              type: 'all',
              dateRange: null,
              search: '',
              mechanicId: 'all',
            })
          }
          className="mt-3 text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
