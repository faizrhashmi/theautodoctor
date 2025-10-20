// src/app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import { ArrowRight } from 'lucide-react';
import ChatBubble from '@/components/chat/ChatBubble';
import SiteFooter from '@/components/layout/SiteFooter';

const inter = Inter({ subsets: ['latin'] });

const NAV_ITEMS = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Services & Pricing', href: '/pricing' },
  { label: 'Knowledge Base', href: '/knowledge-base' },
  { label: 'Contact', href: '/contact' },
  { label: 'For Mechanics', href: '/mechanic/login' },
];

export const metadata: Metadata = {
  title: 'AskAutoDoctor',
  description:
    'Certified mechanics on demand - online diagnostics & inspections across Ontario.',
  // If you have /app/icon.png and /app/apple-icon.png, Next will auto-detect.
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ===== HEADER ===== */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-screen-xl items-center px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100 transition hover:text-white">
              <Image src="/logo.png" alt="AskAutoDoctor" width={30} height={30} priority />
              <span>AskAutoDoctor</span>
            </Link>

            <nav className="hidden md:flex flex-1 items-center justify-end gap-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative text-sm font-medium text-slate-300 transition hover:text-white"
                >
                  {item.label}
                  <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-px scale-x-0 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-3 md:gap-4">
              <Link
                href="/signup"
                className="group ml-6 md:ml-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              >
                Book Now
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <MobileMenu />
            </div>
          </div>
        </header>

        {/* Push content below the fixed header */}
        <main className="pt-16">{children}</main>
        <SiteFooter />
        <ChatBubble />
      </body>
    </html>
  );
}

/**
 * Mobile menu uses native <details>/<summary> so it works without client JS.
 * No hooks = safe to keep this in a server component file.
 */
function MobileMenu() {
  return (
    <details className="relative md:hidden">
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white/5 text-slate-200 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white"
        aria-label="Toggle navigation menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </summary>

      <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
          <div className="mt-3 grid gap-2">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400"
          >
            Book Now
          </Link>
        </div>
      </div>
    </details>
  );
}
