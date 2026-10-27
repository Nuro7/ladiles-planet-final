import { useState } from 'react';
import { Link } from 'react-router-dom';
import LadiesPlanetLogo from '../../components/LadiesPlanetLogo';
import Reveal from '../primitives/Reveal';
import { useScrollTo } from '../smooth/lenisContext';

const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/ladies_planet_/', d: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.5 6.5h.01M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z' },
  { label: 'Website', href: 'https://ladiesplanet.netlify.app/', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z' },
];

/** Luxury minimal footer — glass social icons, newsletter, quiet legal line. */
export default function Footer() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const scrollTo = useScrollTo();

  const submit = (e) => {
    e.preventDefault();
    if (email.trim()) { setSent(true); setEmail(''); }
  };

  const jump = (anchor) => (e) => { e.preventDefault(); scrollTo(anchor); };

  return (
    <footer style={{ position: 'relative', background: 'var(--cine-wine-5)', borderTop: '1px solid var(--cine-glass-border)', overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)', width: '70vw', height: '40vw', background: 'radial-gradient(circle, rgba(var(--cine-gold-rgb),0.30), transparent 62%)', pointerEvents: 'none' }} />

      <div className="cine-container" style={{ position: 'relative', zIndex: 2, paddingTop: 'clamp(64px,9vh,110px)', paddingBottom: 40 }}>
        <Reveal variant="up">
          <div className="cine-foot-top">
            <div className="cine-foot-brand">
              <LadiesPlanetLogo height={34} variant="white" />
              <p style={{ marginTop: 20, maxWidth: '34ch', color: 'rgba(var(--cine-ivory-rgb),0.6)', lineHeight: 1.7 }}>
                The world&rsquo;s first AI Bridal Wall — cinematic bridal portraits, films
                and invitations, crafted from a single photograph.
              </p>
              <div className="cine-foot-socials">
                {SOCIALS.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="cine-foot-social cine-glass" data-cursor="hover">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d={s.d} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" /></svg>
                  </a>
                ))}
              </div>
            </div>

            <div className="cine-foot-cols">
              <div>
                <span className="cine-foot-h">Explore</span>
                <a href="#cine-top" onClick={jump('#cine-top')}>Home</a>
                <a href="#cine-experience" onClick={jump('#cine-experience')}>Experience</a>
              </div>
              <div>
                <span className="cine-foot-h">Studio</span>
                <Link to="/studio">Bridal Studio</Link>
                <Link to="/studio">Bridal Poster</Link>
                <Link to="/studio">Bridal Film</Link>
                <Link to="/pricing">Pricing</Link>
              </div>
              <div className="cine-foot-news">
                <span className="cine-foot-h">The List</span>
                <p style={{ color: 'rgba(var(--cine-ivory-rgb),0.6)', fontSize: '0.9rem', marginBottom: 14 }}>
                  Private previews and bridal inspiration, delivered rarely.
                </p>
                <form onSubmit={submit} className="cine-foot-form">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com" aria-label="Email address" />
                  <button type="submit" aria-label="Subscribe" data-cursor="hover">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </form>
                {sent && <span style={{ display: 'inline-block', marginTop: 12, fontSize: '0.82rem', color: 'var(--cine-gold)' }}>Thank you — you&rsquo;re on the list.</span>}
              </div>
            </div>
          </div>
        </Reveal>

        <hr className="cine-rule" style={{ margin: 'clamp(40px,6vh,64px) 0 26px' }} />

        <div className="cine-foot-bottom">
          <span>© {new Date().getFullYear()} Ladies Planet · AI Bridal Wall. All rights reserved.</span>
          <span className="cine-foot-legal">
            <a href="mailto:hello@ladiesplanet.ai">hello@ladiesplanet.ai</a>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </span>
        </div>
      </div>

      <style>{`
        .cine-foot-top { display: grid; grid-template-columns: 1.2fr 1.6fr; gap: clamp(30px,5vw,80px); }
        .cine-foot-socials { display: flex; gap: 12px; margin-top: 28px; }
        .cine-foot-social { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center;
          color: var(--cine-ivory); transition: color 0.3s ease, border-color 0.3s ease, transform 0.3s ease; }
        .cine-foot-social:hover { color: var(--cine-gold); border-color: rgba(var(--cine-gold-rgb),0.5); transform: translateY(-3px); }

        .cine-foot-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: clamp(20px,3vw,44px); }
        .cine-foot-cols > div { display: flex; flex-direction: column; gap: 12px; }
        .cine-foot-h { font-family: var(--cine-sans); font-size: 0.74rem; letter-spacing: 0.24em;
          text-transform: uppercase; color: var(--cine-gold); margin-bottom: 8px; }
        .cine-foot-cols a { color: rgba(var(--cine-ivory-rgb),0.66); font-size: 0.95rem; transition: color 0.25s ease; width: fit-content; }
        .cine-foot-cols a:hover { color: #fff; }

        .cine-foot-form { display: flex; gap: 8px; }
        .cine-foot-form input {
          flex: 1; min-width: 0; background: var(--cine-glass-bg); border: 1px solid var(--cine-glass-border);
          border-radius: 100px; padding: 12px 18px; color: var(--cine-ivory); font-family: var(--cine-sans);
          font-size: 0.9rem; outline: none; transition: border-color 0.3s ease; }
        .cine-foot-form input:focus { border-color: rgba(var(--cine-gold-rgb),0.6); }
        .cine-foot-form input::placeholder { color: rgba(var(--cine-ivory-rgb),0.4); }
        .cine-foot-form button { width: 46px; height: 46px; flex: 0 0 auto; border-radius: 50%;
          display: grid; place-items: center; color: var(--cine-wine-5);
          background: linear-gradient(135deg,#ECD9A8,#D4AF6A 55%,#BE9352);
          box-shadow: 0 6px 18px rgba(var(--cine-gold-rgb),0.32); transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .cine-foot-form button:hover { box-shadow: 0 8px 26px rgba(var(--cine-gold-rgb),0.5); transform: translateY(-1px); }

        .cine-foot-bottom { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap;
          font-size: 0.82rem; color: rgba(var(--cine-ivory-rgb),0.5); }
        .cine-foot-legal { display: flex; gap: 22px; }
        .cine-foot-legal a { color: rgba(var(--cine-ivory-rgb),0.5); transition: color 0.25s ease; }
        .cine-foot-legal a:hover { color: var(--cine-gold); }
        /* Finger-sized footer links on touch screens. */
        @media (pointer: coarse) { .cine-foot-cols a, .cine-foot-legal a { display: inline-flex; align-items: center; min-height: 44px; } }

        @media (max-width: 860px){
          .cine-foot-top { grid-template-columns: 1fr; }
          .cine-foot-cols { grid-template-columns: 1fr 1fr; }
          .cine-foot-news { grid-column: 1 / -1; }
        }
        @media (max-width: 520px){ .cine-foot-cols { grid-template-columns: 1fr; } }
      `}</style>
    </footer>
  );
}
