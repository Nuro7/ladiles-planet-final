/**
 * Sidebar.jsx — left navigation rail. The active item carries the couture-thread
 * (a gold hairline) signature. Groups: Create · Library · System.
 */
import { NavLink } from 'react-router-dom';
import { MODULES, GROUPS } from '../nav';
import { useUIStore } from '../store';

export default function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUIStore((s) => s.closeMobileNav);

  const renderItem = (m) => {
    const Icon = m.icon;
    return (
      <NavLink
        key={m.id}
        to={`/studio/${m.path}`}
        className={({ isActive }) => `s-nav ${isActive ? 'is-active' : ''}`}
        title={collapsed ? m.label : undefined}
        onClick={closeMobileNav}
      >
        <Icon size={18} strokeWidth={1.75} />
        <span className="s-nav__text">{m.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      {mobileNavOpen && <div className="s-sidebar__scrim" onClick={closeMobileNav} />}
      <nav className={`s-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileNavOpen ? 'is-open' : ''}`} aria-label="Studio navigation">
        {GROUPS.filter((g) => g !== 'System').map((group) => (
          <div className="s-sidebar__group" key={group}>
            <div className="s-sidebar__label">{group}</div>
            {MODULES.filter((m) => m.group === group).map(renderItem)}
          </div>
        ))}

        <div className="s-sidebar__spacer" />

        <img
          src="/bridalstudio.png"
          alt="Bridal Studio — powered by Nuro 7"
          className="s-sidebar__brandmark"
        />
      </nav>
    </>
  );
}
