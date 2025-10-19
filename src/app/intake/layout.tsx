// src/app/intake/layout.tsx
// Force this entire segment to be dynamic and uncached,
// even if a parent layout accidentally sets caching.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
