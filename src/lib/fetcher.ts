// src/lib/fetcher.ts
/**
 * Centralized helpers to avoid invalid `revalidate` shapes.
 * Use these from server components or server actions.
 */

export async function noStoreFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, cache: 'no-store' });
}

export async function revalidateFetch(
  input: RequestInfo | URL,
  seconds = 60,
  init: RequestInit = {}
) {
  return fetch(input, { ...init, next: { revalidate: seconds } });
  // NOTE: Do NOT use next: { revalidate: 60 } — must be a number.
}
