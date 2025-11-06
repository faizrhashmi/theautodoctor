/**
 * New Requests Indicator Store
 *
 * Tier 4: Visual indicators for pending session requests
 * Lightweight state management for badge count
 */

import { create } from 'zustand'

interface NewRequestsState {
  count: number
  bump: () => void
  clear: () => void
}

export const useNewRequestsIndicator = create<NewRequestsState>((set) => ({
  count: 0,
  bump: () => set((state) => ({ count: state.count + 1 })),
  clear: () => set({ count: 0 }),
}))
