// src/app/signup/layout.tsx
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
