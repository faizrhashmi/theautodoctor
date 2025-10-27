// src/app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
// import ChatBubble from '@/components/chat/ChatBubble'; // Hidden temporarily
import SiteFooter from '@/components/layout/SiteFooter';
import ClientNavbar from '@/components/layout/ClientNavbar';
import ConditionalMainWrapper from '@/components/layout/ConditionalMainWrapper';

const inter = Inter({ subsets: ['latin'] });

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
        {/* Client-side Navbar with user state awareness */}
        <ClientNavbar />

        {/* Conditional wrapper - adds pt-16 for public pages, nothing for authenticated pages */}
        <ConditionalMainWrapper>{children}</ConditionalMainWrapper>

        <SiteFooter />
        {/* <ChatBubble /> */} {/* Hidden temporarily - needs real backend integration */}
      </body>
    </html>
  );
}
