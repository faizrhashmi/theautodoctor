'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Wrench,
  MessageSquare,
  FileText,
  Car,
  Mic,
  X,
  ChevronRight,
  Camera,
  Lightbulb,
  Calculator,
  Search
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import QuickResponseTemplates from './QuickResponseTemplates'
import QuoteBuilderDrawer from './QuoteBuilderDrawer'
import VINDecoderModal from './VINDecoderModal'
import VoiceInputButton from './VoiceInputButton'

interface MechanicToolsPanelProps {
  sessionId: string
  mechanicId: string
  onInsertTemplate: (text: string) => void
  onVoiceTranscript: (text: string) => void
  sessionStartedAt: string | null
  isSessionActive: boolean
}

export default function MechanicToolsPanel({
  sessionId,
  mechanicId,
  onInsertTemplate,
  onVoiceTranscript,
  sessionStartedAt,
  isSessionActive
}: MechanicToolsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true)
  const [activeModal, setActiveModal] = useState<'quote' | 'vin' | null>(null)

  // Draggable button state
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true)
    setDragStart({
      x: clientX - buttonPosition.x,
      y: clientY - buttonPosition.y
    })
  }, [buttonPosition])

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return

    const newX = clientX - dragStart.x
    const newY = clientY - dragStart.y

    // Keep button within viewport bounds
    // Button default position: right-4 (16px from right), bottom-20 (80px from bottom)
    // Button size: 56px (h-14 w-14)
    const buttonSize = 56
    const initialRight = 16  // right-4
    const initialBottom = 80 // bottom-20

    // Calculate max movement to keep button visible (leave 8px visible on each edge)
    const minVisiblePx = 8

    // Max left: button can move left until only minVisiblePx is showing on left edge
    const maxLeft = -(window.innerWidth - initialRight - buttonSize - minVisiblePx)

    // Max right: button already starts near right edge, allow small movement
    const maxRight = initialRight - minVisiblePx

    // Max up: button can move up until only minVisiblePx is showing on top
    const maxUp = -(window.innerHeight - initialBottom - buttonSize - minVisiblePx)

    // Max down: button can move down until only minVisiblePx is showing on bottom
    const maxDown = initialBottom - minVisiblePx

    setButtonPosition({
      x: Math.max(maxLeft, Math.min(maxRight, newX)),
      y: Math.max(maxUp, Math.min(maxDown, newY))
    })
  }, [isDragging, dragStart])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY)
  }, [handleDragMove])

  const handleMouseUp = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      handleDragStart(touch.clientX, touch.clientY)
    }
  }

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault()
      const touch = e.touches[0]
      handleDragMove(touch.clientX, touch.clientY)
    }
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // Setup global event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Handle button click vs drag
  const handleButtonClick = () => {
    // Only toggle if not dragging
    if (!isDragging) {
      setIsOpen(!isOpen)
    }
  }

  const tools = [
    {
      id: 'templates',
      icon: MessageSquare,
      label: 'Quick Replies',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      hoverColor: 'hover:bg-blue-500/20'
    },
    {
      id: 'quote',
      icon: FileText,
      label: 'Create Quote',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      hoverColor: 'hover:bg-green-500/20',
      onClick: () => setActiveModal('quote')
    },
    {
      id: 'vin',
      icon: Car,
      label: 'VIN Lookup',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      hoverColor: 'hover:bg-purple-500/20',
      onClick: () => setActiveModal('vin')
    },
    {
      id: 'diagnostic',
      icon: Camera,
      label: 'Request Photos',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      hoverColor: 'hover:bg-cyan-500/20',
      onClick: () => {
        onInsertTemplate('Please upload clear photos of the affected area so I can inspect the issue in detail. Multiple angles would be helpful.')
      }
    },
    {
      id: 'dtc',
      icon: Search,
      label: 'DTC Lookup',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      hoverColor: 'hover:bg-yellow-500/20',
      onClick: () => {
        const code = prompt('Enter DTC code (e.g., P0300):')
        if (code) {
          window.open(`https://www.obd-codes.com/trouble_codes/${code.toLowerCase()}.php`, '_blank')
        }
      }
    },
    {
      id: 'suggestions',
      icon: Lightbulb,
      label: 'AI Suggestions',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      hoverColor: 'hover:bg-amber-500/20',
      onClick: () => {
        onInsertTemplate('Based on the symptoms you described, here are some potential causes I\'d like to investigate...')
      }
    },
    {
      id: 'labor',
      icon: Calculator,
      label: 'Labor Estimate',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      hoverColor: 'hover:bg-indigo-500/20',
      onClick: () => {
        onInsertTemplate('Let me calculate the estimated labor time for this repair based on industry standards.')
      }
    }
  ]

  return (
    <>
      {/* Mobile Toggle Button - Draggable */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          transform: `translate(${buttonPosition.x}px, ${buttonPosition.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        className="lg:hidden fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl hover:from-orange-600 hover:to-orange-700 transition-colors touch-none select-none"
        aria-label="Toggle mechanic tools (draggable)"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Wrench className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed right-0 top-0 bottom-0 z-40 w-[85vw] max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-l border-slate-700 shadow-2xl overflow-y-auto scrollbar-none pb-[env(safe-area-inset-bottom)]"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 backdrop-blur-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Mechanic Tools</h2>
                      <p className="text-xs text-slate-400">Productivity suite</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-6">
                {/* Quick Tools Grid */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {tools.map((tool) => {
                      const Icon = tool.icon
                      return (
                        <button
                          key={tool.id}
                          onClick={tool.onClick}
                          className={`flex flex-col items-center gap-2 rounded-xl border border-slate-700 ${tool.bgColor} p-4 transition ${tool.hoverColor}`}
                        >
                          <Icon className={`h-6 w-6 ${tool.color}`} />
                          <span className="text-xs font-medium text-slate-200 text-center">
                            {tool.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Response Templates */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Responses</h3>
                  <QuickResponseTemplates onInsert={(text) => {
                    onInsertTemplate(text)
                    setIsOpen(false)
                  }} />
                </div>

                {/* Voice Input */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Voice Input</h3>
                  <VoiceInputButton onTranscript={onVoiceTranscript} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <AnimatePresence>
        {isDesktopPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="hidden lg:block fixed right-0 top-16 bottom-0 w-80 border-l border-slate-700 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 overflow-y-auto scrollbar-none"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 backdrop-blur-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Mechanic Tools</h2>
                    <p className="text-xs text-slate-400">Productivity suite</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDesktopPanelOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                  aria-label="Close tools panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Quick Tools */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {tools.map((tool) => {
                    const Icon = tool.icon
                    return (
                      <button
                        key={tool.id}
                        onClick={tool.onClick}
                        className={`w-full flex items-center gap-3 rounded-xl border border-slate-700 ${tool.bgColor} p-3 transition ${tool.hoverColor}`}
                      >
                        <Icon className={`h-5 w-5 ${tool.color}`} />
                        <span className="flex-1 text-left text-sm font-medium text-slate-200">
                          {tool.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Response Templates */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Quick Responses</h3>
                <QuickResponseTemplates onInsert={onInsertTemplate} />
              </div>

              {/* Voice Input */}
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Voice Input</h3>
                <VoiceInputButton onTranscript={onVoiceTranscript} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button for desktop when panel is closed */}
      {!isDesktopPanelOpen && (
        <button
          onClick={() => setIsDesktopPanelOpen(true)}
          className="hidden lg:flex fixed right-4 bottom-4 z-40 h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-2xl hover:from-orange-600 hover:to-orange-700 transition-colors"
          aria-label="Open mechanic tools"
        >
          <Wrench className="h-6 w-6" />
        </button>
      )}

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'quote' && (
          <QuoteBuilderDrawer
            sessionId={sessionId}
            mechanicId={mechanicId}
            onClose={() => setActiveModal(null)}
          />
        )}
        {activeModal === 'vin' && (
          <VINDecoderModal
            onClose={() => setActiveModal(null)}
            onInsert={onInsertTemplate}
          />
        )}
      </AnimatePresence>
    </>
  )
}
