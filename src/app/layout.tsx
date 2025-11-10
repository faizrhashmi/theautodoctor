// src/app/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
// import ChatBubble from '@/components/chat/ChatBubble'; // Hidden temporarily
import ClientNavbar from '@/components/layout/ClientNavbar';
import ConditionalMainWrapper from '@/components/layout/ConditionalMainWrapper';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import { SessionMonitor } from '@/components/auth/AuthValidator';
import { ClientThemeProvider } from '@/components/providers/ClientThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AskAutoDoctor',
  description:
    'Certified mechanics on demand - online diagnostics & inspections across Ontario.',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientThemeProvider>
          {/* Global session monitoring - validates auth and handles stale sessions */}
          <SessionMonitor />

          {/* Client-side Navbar with user state awareness */}
          <ClientNavbar />

          {/* Conditional wrapper - adds pt-16 for public pages, nothing for authenticated pages */}
          <ConditionalMainWrapper>{children}</ConditionalMainWrapper>

          {/* Conditional footer - shows on public pages, hides on dashboards/chat/video for immersive experience */}
          <ConditionalFooter />
          {/* <ChatBubble /> */} {/* Hidden temporarily - needs real backend integration */}
        </ClientThemeProvider>
      </body>
    </html>
  );
}
