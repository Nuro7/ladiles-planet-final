import CinematicLanding from '../landing/CinematicLanding';

/**
 * Public landing route (`/`).
 * Renders the cinematic "AI Bridal Wall" experience. All of the heavy lifting
 * (smooth scroll, loader, cursor, WebGL, sections) lives under ../landing so
 * this file stays a thin, stable route entry.
 */
export default function LandingPage() {
  return <CinematicLanding />;
}
