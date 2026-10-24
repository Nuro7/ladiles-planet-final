/**
 * TopBar.jsx — application chrome: brand, workspace switcher, search, credits,
 * notifications, profile.
 */
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Gem, PanelLeft, Menu } from 'lucide-react';
import { useUIStore, useCreditsStore } from '../store';
import { IconButton } from '../primitives';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useAuth } from '../../context/AuthContext';
import LadiesPlanetLogo from '../../components/LadiesPlanetLogo';

export default function TopBar() {
  const navigate = useNavigate();
  const { setCommandOpen, toggleSidebar, toggleMobileNav, toast } = useUIStore();
  const balance = useCreditsStore((s) => s.balance);
  const { user } = useAuth();
  const isMobile = useBreakpoint() === 'mobile';

  const initial = (user?.email || 'L')[0].toUpperCase();

  return (
    <header className="s-topbar">
      {isMobile
        ? <IconButton icon={Menu} label="Open menu" onClick={toggleMobileNav} />
        : <IconButton icon={PanelLeft} label="Toggle sidebar" onClick={toggleSidebar} />}

      <a className="s-topbar__brand" href="/" title="Back to Ladies Planet">
        <span className="s-topbar__lockup">
          <LadiesPlanetLogo height={22} variant="white" />
        </span>
      </a>

      <div className="s-topbar__spacer" />

      <button className="s-btn s-btn--ghost s-topbar__search" style={{ border: '1px solid var(--border)', color: 'var(--muted)', padding: '7px 12px' }}
        onClick={() => setCommandOpen(true)}>
        <Search size={14} /> <span className="s-topbar__search-label" style={{ fontWeight: 500 }}>Search</span>
        <kbd className="s-mono" style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px' }}>⌘K</kbd>
      </button>

      <a className="s-credits" href="/pricing" title="Credits · top up">
        <Gem size={14} /> <b>{balance?.credits ?? '—'}</b>
        <span className="s-topbar__credits-label" style={{ color: 'var(--muted)' }}>credits</span>
      </a>

      <IconButton icon={Bell} label="Notifications"
        onClick={() => toast({ title: 'All caught up', body: 'No new notifications.' })} />

      <button
        onClick={() => navigate('/studio/settings')}
        title={user?.email || 'Profile'}
        style={{
          width: 'var(--avatar-size, 32px)', height: 'var(--avatar-size, 32px)', borderRadius: 50, cursor: 'pointer', flexShrink: 0,
          background: 'linear-gradient(135deg, #ECD9A8, #8E6A3C)', color: '#2A0207',
          border: 'none', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)',
        }}>
        {initial}
      </button>
    </header>
  );
}
