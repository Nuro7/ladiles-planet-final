/**
 * store.js — Zustand stores for cross-cutting studio state.
 * Per-module generation & settings stay local to each module (proven pattern);
 * these stores hold only what the shell shares: UI chrome, toasts, credits.
 */
import { create } from 'zustand';

/* ── UI chrome: command palette, sidebar, toasts ────────── */
export const useUIStore = create((set) => ({
  commandOpen: false,
  setCommandOpen: (v) => set({ commandOpen: v }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Mobile off-canvas nav drawer (separate from the desktop collapse above).
  mobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  closeMobileNav: () => set({ mobileNavOpen: false }),

  toasts: [],
  toast: (t) => {
    const id = (typeof performance !== 'undefined' ? performance.now() : 0) + Math.round(Math.random() * 1e6);
    set((s) => ({ toasts: [...s.toasts, { id, variant: 'info', ...t }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), t.duration ?? 4200);
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/* ── Shared credits / provider balance ──────────────────── */
export const useCreditsStore = create((set) => ({
  balance: { credits: '—' },
  setBalance: (balance) => set({ balance: balance || { credits: '—' } }),
}));
