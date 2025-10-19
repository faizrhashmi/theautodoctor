// src/app/intake/template.tsx
// Template also inherits segment config to guarantee no caching.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function IntakeTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
