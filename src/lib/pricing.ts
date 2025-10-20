import { Timer, FileText, MessageCircle, Gauge, CheckCircle2 } from 'lucide-react'

export const OFFERINGS = [
  {
    name: 'Free Session',
    price: '$0',
    duration: 'Up to 5 minutes',
    description: 'Sample AskAutoDoctor with a short text-only conversation.',
    features: ['Chat with a certified mechanic', 'Share one photo or video clip', 'Quick go/no-go advice']
  },
  {
    name: 'Quick Chat',
    price: '$9.99',
    duration: '30 minutes',
    description: 'Fast text triage when you need reassurance or a second opinion.',
    features: ['Private text workspace', 'Send photos, videos, and scan data', 'Action plan before chat ends']
  },
  {
    name: 'Standard Video',
    price: '$29.99',
    duration: '45 minutes',
    description: 'Live video session to troubleshoot, inspect, and plan next steps.',
    features: ['HD video & screen sharing', 'Guided inspections & documentation', 'Session recording link']
  },
  {
    name: 'Full Diagnostic',
    price: '$49.99',
    duration: '60 minutes',
    description: 'Deep dive consultation with written summary and repair roadmap.',
    features: ['Senior mechanic lead', 'Multiple issues covered in one call', 'Detailed follow-up report']
  }
]

export const VALUE_ADDS = [
  {
    title: 'Integrated session timer',
    description: 'Real-time countdown with warnings at 5 minutes and 60 seconds remaining.',
    icon: Timer
  },
  {
    title: 'Secure file sharing',
    description: 'Drag-and-drop documents, diagnostics, and receipts to a shared vault.',
    icon: FileText
  },
  {
    title: 'Pro-grade messaging',
    description: 'Floating chat bubble follows you across pages with minimize/close controls.',
    icon: MessageCircle
  },
  {
    title: 'Mechanic availability tools',
    description: 'Set weekly blocks, pause specific days, and sync with bookings instantly.',
    icon: Gauge
  },
  {
    title: 'Session extensions',
    description: 'Approve paid time extensions mid-call and charge through Stripe.',
    icon: CheckCircle2
  }
]
