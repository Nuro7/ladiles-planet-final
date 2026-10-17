/**
 * useBreakpoint — tiny responsive helper for inline-styled components.
 *
 * Returns one of 'mobile' | 'tablet' | 'desktop' based on viewport width,
 * using the systematic breakpoints recommended by the UI/UX guidelines
 * (≈375 / 768 / 1024). Resize updates are throttled via requestAnimationFrame
 * so we don't thrash React state on every pixel.
 *
 *   const bp = useBreakpoint();
 *   const isMobile  = bp === 'mobile';
 *   const isTablet  = bp === 'tablet';
 *   const isDesktop = bp === 'desktop';
 */
import { useState, useEffect } from 'react';

export const BREAKPOINTS = { tablet: 768, desktop: 1024 };

function read() {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < BREAKPOINTS.tablet) return 'mobile';
    if (w < BREAKPOINTS.desktop) return 'tablet';
    return 'desktop';
}

export default function useBreakpoint() {
    const [bp, setBp] = useState(read);

    useEffect(() => {
        let raf = 0;
        const onResize = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                setBp(prev => {
                    const next = read();
                    return next === prev ? prev : next;
                });
            });
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(raf);
        };
    }, []);

    return bp;
}
