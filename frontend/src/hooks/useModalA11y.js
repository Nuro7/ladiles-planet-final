import { useEffect, useRef } from 'react';

/**
 * useModalA11y — shared modal accessibility for the studio/pricing dialogs.
 * Handles the three things every modal here was missing inconsistently:
 *   • Escape closes the dialog
 *   • focus moves into the dialog on open (first focusable, else the dialog)
 *   • Tab is trapped inside the dialog
 *   • focus returns to the trigger element on close
 *
 * Usage:
 *   const ref = useRef(null);
 *   useModalA11y(ref, onClose);
 *   return <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1}>…</div>;
 *
 * onClose may change identity between renders — we read the latest via a ref so
 * the effect runs once on mount (and never re-steals focus while you type).
 */
export default function useModalA11y(dialogRef, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = dialogRef.current;
    const previouslyFocused = document.activeElement;

    const focusables = () => {
      if (!node) return [];
      return Array.from(
        node.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.disabled && el.offsetParent !== null);
    };

    // Move focus into the dialog once, on open.
    (focusables()[0] || node)?.focus?.();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key === 'Tab' && node) {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
    // dialogRef is stable; onClose is read via closeRef — run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
