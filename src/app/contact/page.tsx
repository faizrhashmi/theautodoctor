import type { Metadata } from 'next'
import { Clock, FileText, Headset, Mail, Phone } from 'lucide-react'
import ContactForm from '@/components/contact/ContactForm'

export const metadata: Metadata = {
  title: 'Contact Support | AskAutoDoctor',
  description:
    'Reach our support team for diagnostic questions, account help or feedback. Submit the contact form and we will respond within one business day.'
}

const SUPPORT_HOURS = [
  { label: 'Monday – Friday', value: '9:00 AM – 9:00 PM ET' },
  { label: 'Saturday', value: '10:00 AM – 4:00 PM ET' },
  { label: 'Sunday', value: 'Closed (leave a message anytime)' }
]

export default function ContactPage() {
  return (
    <div className="bg-slate-50">
      <section className="border-b border-slate-200 bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-100">
            <Headset className="h-3.5 w-3.5" />
            Support Team
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Contact Us</h1>
          <p className="mt-4 max-w-2xl text-sm text-blue-100 sm:text-base">
            We are here to help with booking questions, technical support and account updates. Complete the form and a specialist will follow up shortly.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">Send us a message</h2>
          <p className="mt-2 text-sm text-slate-600">
            Share as much detail as possible. Attach screenshots, invoices or diagnostic reports so our mechanics can review before reaching out.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
              <Clock className="h-4 w-4" />
              Support hours
            </h3>
            <ul className="mt-4 space-y-3">
              {SUPPORT_HOURS.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-blue-800">
              Outside of live hours we monitor incoming requests and reply first thing next business day.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
              <Mail className="h-4 w-4" />
              Prefer email or phone?
            </h3>
            <div className="mt-4 space-y-3">
              <p>
                Email us at
                <a href="mailto:support@theautodoctor.com" className="ml-1 font-medium text-blue-700 hover:text-blue-900">
                  support@theautodoctor.com
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>1 (888) 555-0136 — leave a voicemail for urgent vehicle issues.</span>
              </p>
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
              <p className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>
                  Need to send multiple files? Upload everything to your customer dashboard and reference the ticket number in your message so our team can locate it fast.
                </span>
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
