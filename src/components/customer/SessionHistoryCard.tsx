'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { Menu, Transition } from '@headlessui/react'
import { MoreVertical, Trash2, Eye, ArrowRight, Video, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SessionHistoryCardProps {
  session: {
    id: string
    plan: string
    type: 'chat' | 'video' | 'diagnostic'
    status: string
    created_at: string
    started_at: string | null
    ended_at: string | null
    mechanic_name: string | null
    planLabel: string
    typeLabel: string
  }
  onViewDetails: () => void
  onDelete?: (sessionId: string) => Promise<void>
}

const STATUS_COLORS: Record<string, string> = {
  live: 'bg-green-500/20 text-green-300',
  waiting: 'bg-yellow-500/20 text-yellow-300',
  pending: 'bg-blue-500/20 text-blue-300',
  scheduled: 'bg-purple-500/20 text-purple-300',
  completed: 'bg-slate-500/20 text-slate-300',
  cancelled: 'bg-red-500/20 text-red-300',
  canceled: 'bg-red-500/20 text-red-300',
}

export default function SessionHistoryCard({ session, onViewDetails, onDelete }: SessionHistoryCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const status = session.status.toLowerCase()
  const isActive = status === 'live' || status === 'waiting'
  const isPending = status === 'pending' || status === 'scheduled'
  const isCanceled = status === 'cancelled' || status === 'canceled'
  const isCompleted = status === 'completed'

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending

  const statusLabel = isActive
    ? 'In Progress'
    : isPending
    ? 'Pending'
    : isCanceled
    ? 'Canceled'
    : 'Completed'

  const formatSessionDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const mins = Math.floor(diffInHours * 60)
      return `${mins} min${mins !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this session? This action cannot be undone.'
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(session.id)
      router.refresh()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-md backdrop-blur transition hover:border-white/20 hover:bg-white/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 gap-4">
          {/* Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 shadow-md">
            {session.type === 'video' ? (
              <Video className="h-6 w-6 text-slate-300" />
            ) : (
              <MessageSquare className="h-6 w-6 text-slate-300" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{session.planLabel}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {session.typeLabel}
                  {session.mechanic_name ? ` · ${session.mechanic_name}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatSessionDate(session.ended_at ?? session.started_at ?? session.created_at)}
                </p>
              </div>

              {/* Three-dot menu - positioned relative to enable absolute dropdown */}
              <Menu as="div" className="relative z-10">
                <Menu.Button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 z-[9999] mt-2 w-48 origin-top-right rounded-xl border border-white/10 bg-slate-900 p-1 shadow-2xl backdrop-blur-xl focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={onViewDetails}
                          className={`${
                            active ? 'bg-white/10' : ''
                          } group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white`}
                        >
                          <Eye className="h-4 w-4 text-slate-400" />
                          View Details
                        </button>
                      )}
                    </Menu.Item>

                    {(isActive || isPending) && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            href={session.type === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`}
                            className={`${
                              active ? 'bg-white/10' : ''
                            } group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white`}
                          >
                            <ArrowRight className="h-4 w-4 text-slate-400" />
                            {isActive ? 'Rejoin Session' : 'Enter Session'}
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    {onDelete && (isCompleted || isCanceled) && (
                      <>
                        <div className="my-1 h-px bg-white/10" />
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleDelete}
                              disabled={isDeleting}
                              className={`${
                                active ? 'bg-red-500/20' : ''
                              } group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 disabled:opacity-50`}
                            >
                              <Trash2 className="h-4 w-4" />
                              {isDeleting ? 'Deleting...' : 'Delete Session'}
                            </button>
                          )}
                        </Menu.Item>
                      </>
                    )}
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>

        {/* Status Badge and Actions */}
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>

          {(isActive || isPending) && (
            <Link
              href={session.type === 'chat' ? `/chat/${session.id}` : `/video/${session.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-700 hover:to-orange-800 hover:shadow-orange-500/50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {isActive ? 'Rejoin' : 'Enter'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
