// src/app/intake/layout.tsx
// Force this entire segment to be dynamic and uncached,
// even if a parent layout accidentally sets caching.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 sm:px-8">
      {children}
    </div>
  );
}
