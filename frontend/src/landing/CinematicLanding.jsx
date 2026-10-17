import { useEffect, useState } from 'react';
import './landing.css';

import { SmoothScrollProvider } from './smooth/SmoothScroll';
import CustomCursor from './cursor/CustomCursor';
import LoadingScreen from './loader/LoadingScreen';
import FloatingNav from './nav/FloatingNav';

import Hero from './sections/Hero';
import FinalCTA from './sections/FinalCTA';
import Footer from './sections/Footer';

/**
 * Ladies Planet — AI Bridal Wall · cinematic landing experience.
 * A tight landing: the full-bleed Hero opening flows straight into the closing
 * FinalCTA — framed by the pre-roll loader, custom cursor and floating nav.
 * Lenis smooth-scroll + GSAP drive motion; every effect degrades gracefully
 * under prefers-reduced-motion. (Additional story sections — including the
 * AnimatedWords "In a Few Words" interlude — still live under ./sections and
 * can be re-added to the <main> below at any time.)
 */
export default function CinematicLanding() {
  const [ready, setReady] = useState(false);

  // Lock body scroll during the loader so the pre-roll reads cleanly.
  useEffect(() => {
    if (ready) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [ready]);

  return (
    <div className="cine-root">
      <LoadingScreen onDone={() => setReady(true)} />
      <CustomCursor />

      <SmoothScrollProvider>
        <FloatingNav />
        <main>
          <Hero ready={ready} />
          <FinalCTA />
        </main>
        <Footer />
      </SmoothScrollProvider>
    </div>
  );
}
