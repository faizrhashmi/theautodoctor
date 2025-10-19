// src/app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// ...rest of your root layout code
// app/layout.tsx
import type { ReactNode } from 'react';
import './globals.css';
import Link from 'next/link';
import Image from 'next/image';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AskAutoDoctor',
  description:
    'Certified mechanics on demand — online diagnostics & inspections across Ontario.',
  // No need to specify icons when using /app/icon.png and /app/apple-icon.png
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* ===== HEADER ===== */}
        <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur border-b">
          <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
             <Link
  href="/"
  className="flex items-center gap-2 text-xl font-bold text-gray-900"
>
  <Image
    src="/logo.png"   // ✅ now served from /public
    alt="AskAutoDoctor"
    width={28}
    height={28}
    priority
  />
  <span>AskAutoDoctor</span>
</Link>


              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/about" className="text-gray-700 hover:text-blue-600">
                  About
                </Link>
                <Link
                  href="/knowledge-base"
                  className="text-gray-700 hover:text-blue-600"
                >
                  Knowledge Base
                </Link>
                <Link href="/pricing" className="text-gray-700 hover:text-blue-600">
                  Pricing
                </Link>
                <Link href="/contact" className="text-gray-700 hover:text-blue-600">
                  Contact
                </Link>

                <Link
                  href="/book"
                  className="ml-2 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
                >
                  🚗 Book Now
                </Link>
              </nav>

              {/* Mobile menu trigger */}
              <div className="md:hidden">
                <MobileMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Push content below the fixed header */}
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}

function MobileMenu() {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none p-2" aria-label="Open menu">
        <svg
          className="h-6 w-6 text-gray-800"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </summary>

      <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-white shadow-md py-2 z-50">
        <Link href="/about" className="block px-4 py-2 hover:bg-gray-100">
          About
        </Link>
        <Link
          href="/knowledge-base"
          className="block px-4 py-2 hover:bg-gray-100"
        >
          Knowledge Base
        </Link>
        <Link href="/pricing" className="block px-4 py-2 hover:bg-gray-100">
          Pricing
        </Link>
        <Link href="/contact" className="block px-4 py-2 hover:bg-gray-100">
          Contact
        </Link>
        <div className="my-2 border-t" />
        <Link
          href="/book"
          className="block px-4 py-2 font-semibold text-blue-600 hover:bg-blue-50"
        >
          🚗 Book Now
        </Link>
      </div>
    </details>
  );
}
