'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
}

export default function VoiceInputButton({ onTranscript }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if Speech Recognition is supported
    if (typeof window === 'undefined') return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    // Initialize recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')

      if (event.results[event.results.length - 1].isFinal) {
        onTranscript(transcript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied')
      } else if (event.error === 'no-speech') {
        toast.error('No speech detected')
      } else {
        toast.error('Voice input failed')
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscript])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        toast.success('Listening... Speak now')
      } catch (error) {
        console.error('Failed to start recognition:', error)
        toast.error('Failed to start voice input')
      }
    }
  }

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
        <MicOff className="h-6 w-6 text-slate-500 mx-auto mb-2" />
        <p className="text-sm text-slate-400">
          Voice input not supported in this browser
        </p>
      </div>
    )
  }

  return (
    <button
      onClick={toggleListening}
      className={`w-full flex items-center justify-center gap-3 rounded-xl border p-4 transition ${
        isListening
          ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
          : 'border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-700/50'
      }`}
    >
      {isListening ? (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/30">
            <Mic className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Listening...</p>
            <p className="text-xs opacity-75">Tap to stop</p>
          </div>
          <div className="flex gap-1">
            <span className="h-2 w-1 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-1 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-1 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
            <Mic className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">Voice Input</p>
            <p className="text-xs text-slate-400">Tap to speak</p>
          </div>
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </>
      )}
    </button>
  )
}
