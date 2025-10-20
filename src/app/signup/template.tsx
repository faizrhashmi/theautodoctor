// src/app/signup/template.tsx
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function SignupTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
