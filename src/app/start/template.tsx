// src/app/start/template.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function StartTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
