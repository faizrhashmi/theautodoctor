import Link from 'next/link'
import { Facebook, Instagram, Twitter } from 'lucide-react'

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/services-pricing', label: 'Services & Pricing' },
  { href: '/knowledge-base', label: 'Knowledge Base' },
  { href: '/contact', label: 'Contact' },
  { href: '/waiver', label: 'Waiver' }
]

const SOCIAL_ICONS = [
  { label: 'Facebook', Icon: Facebook },
  { label: 'Twitter', Icon: Twitter },
  { label: 'Instagram', Icon: Instagram }
]

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">AskAutoDoctor</p>
            <p className="mt-3 max-w-xl text-sm text-slate-400">
              Certified mechanics on demand. Book live diagnostics, share files and chat with experts to get honest advice before
              you visit a shop.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Stay connected</p>
          <p className="text-xs text-slate-400">
            Follow along as we roll out new features for real-time diagnostics, scheduling and support.
          </p>
          <div className="flex items-center gap-3">
            {SOCIAL_ICONS.map(({ label, Icon }) => (
              <span
                key={label}
                title={`${label} coming soon`}
                aria-label={`${label} icon (coming soon)`}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            ))}
          </div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">More socials coming soon</p>
        </div>
      </div>

      <div className="border-t border-white/5 bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AskAutoDoctor. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms
            </Link>
            <span className="text-slate-700">•</span>
            <p className="text-slate-500">Made with care by real mechanics.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
