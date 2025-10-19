// DEBUG (temporary)
if (process.env.NODE_ENV === 'development') {
  const originalFetch = global.fetch;
  // @ts-ignore
  global.fetch = async (...args: any[]) => {
    const init = args[1];
    if (init?.next && typeof init.next.revalidate === 'object') {
      console.error('[INVALID revalidate FOUND under /start]:', init.next);
      console.error(new Error().stack);
    }
    // @ts-ignore
    return originalFetch(...args);
  };
}
// src/app/start/layout.tsx
// Server component that forces this segment to be fully dynamic & uncached.
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
