// src/instrumentation.ts
// Runs once on the server at startup. We'll wrap global fetch to detect invalid `next.revalidate` shapes.
// Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit & { next?: any }) => {
    try {
      const n = (init as any)?.next;
      if (n && typeof n === 'object' && 'revalidate' in n && typeof n.revalidate === 'object' && n.revalidate !== null) {
        // Log a very loud message so we can see who called it
        const err = new Error('[DIAGNOSTIC] Invalid next.revalidate object detected');
        console.error(err.stack);
      }
    } catch {}
    return originalFetch(input as any, init as any);
  }) as typeof fetch;
}
