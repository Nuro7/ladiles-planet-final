import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import LadiesPlanetLogo from '../../components/LadiesPlanetLogo';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useScrollTo } from '../smooth/lenisContext';

/**
 * Floating glass navigation. Fades in after the loader, condenses + blurs
 * once the hero is passed, and hides on scroll-down / reveals on scroll-up.
 */
export default function FloatingNav() {
  const scrollTo = useScrollTo();
  const isMobile = useBreakpoint() === 'mobile';
  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Logo (LADIES PLANET wordmark) + "Bridal Studio" lockup. On phones we drop
  // the divider and shrink both marks so the pair never overflows the bar.
  const logoH = isMobile ? (condensed ? 20 : 22) : (condensed ? 26 : 30);
  const subH  = isMobile ? (condensed ? 22 : 24) : (condensed ? 28 : 34);

  useEffect(() => {
    let last = 0;
    // Lenis scrolls the window natively, so a plain scroll listener stays in
    // sync during smooth scrolling too.
    const onScroll = () => {
      const y = window.scrollY;
      setCondensed(y > 80);
      setHidden(y > 560 && y > last + 4);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: hidden ? -120 : 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 900,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: condensed
          ? 'clamp(10px,1.3vw,16px) clamp(20px,4vw,54px)'
          : 'clamp(22px,2.6vw,34px) clamp(20px,4vw,54px)',
        transition: 'padding 0.5s var(--cine-ease), background 0.5s ease, border-color 0.5s ease',
        background: condensed ? 'rgba(var(--cine-wash-rgb),0.6)' : 'transparent',
        backdropFilter: condensed ? 'blur(20px) saturate(150%)' : 'none',
        WebkitBackdropFilter: condensed ? 'blur(20px) saturate(150%)' : 'none',
        borderBottom: `1px solid ${condensed ? 'var(--cine-glass-border)' : 'transparent'}`,
      }}
    >
      <div
        style={{
          display: 'inline-flex', alignItems: 'center',
          gap: isMobile ? 9 : 'clamp(12px,1.4vw,18px)',
        }}>
        {/* Ladies Planet logo → home (scroll to top when already on the landing page) */}
        <Link to="/" onClick={() => scrollTo('#cine-top')}
          aria-label="Ladies Planet — home"
          style={{ display: 'inline-flex', alignItems: 'center' }}>
          <LadiesPlanetLogo height={logoH} variant="white" />
        </Link>
        {!isMobile && (
          <span aria-hidden style={{
            width: 1, height: condensed ? 22 : 28, flexShrink: 0,
            background: 'rgba(var(--cine-ivory-rgb),0.28)',
            transition: 'height 0.5s var(--cine-ease)',
          }} />
        )}
        {/* Bridal Studio mark → enter the studio */}
        <Link to="/studio"
          aria-label="Enter Bridal Studio"
          style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img
            src="/bridalstudio.png"
            alt="Bridal Studio — powered by Nuro 7"
            style={{
              height: subH, display: 'block', flexShrink: 0,
              // Source art is black; invert it to sit on the dark cinematic bar.
              filter: 'invert(1)', opacity: 0.92,
              transition: 'height 0.5s var(--cine-ease)',
            }}
          />
        </Link>
      </div>
    </motion.header>
  );
}
