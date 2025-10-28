// src/app/signup/layout.tsx
'use client'

import type { ReactNode } from 'react';

/**
 * Layout for signup/login pages
 *
 * IMPORTANT: This layout intentionally does NOT show CustomerNavbar
 * The signup/login page should have no customer-specific navigation
 * to avoid confusion with stale sessions or during authentication
 */
export default function SignupLayout({ children }: { children: ReactNode }) {
  // No navbar on signup/login pages - keep it clean and focused
  return <>{children}</>;
}
