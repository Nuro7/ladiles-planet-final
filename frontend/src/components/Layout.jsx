import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, Home, Users, Package, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmAction, showToast } from '../utils/notifications';

const NAV = [
    { to: '/',              icon: Home,     label: 'Home',      exact: true },
    { to: '/admin',         icon: Sparkles, label: 'Studio',    exact: true },
    { to: '/admin/brides',  icon: Users,    label: 'Brides'                 },
    { to: '/admin/dresses', icon: Package,  label: 'Dresses'                },
];

export default function Layout({ children }) {
    const { logout } = useAuth();
    const navigate   = useNavigate();

    const handleLogout = async () => {
        const ok = await confirmAction('Sign out', 'End your current session?', 'Sign out', 'question');
        if (ok) {
            await logout();
            navigate('/login');
            showToast('Signed out', 'info');
        }
    };

    const [isLightMode, setIsLightMode] = useState(false);

    useEffect(() => {
        setIsLightMode(document.documentElement.getAttribute('data-theme') === 'light');
    }, []);

    const toggleTheme = () => {
        const newTheme = isLightMode ? 'dark' : 'light';
        setIsLightMode(!isLightMode);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-deep)', color: 'var(--white)', fontFamily: '"Open Sans", "Jost", sans-serif' }}>
            
            {/* ── Minimalist Top Navigation ── */}
            <header style={{
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 60px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-dark)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                        src="https://ladiesplanet.netlify.app/resources/img/logo%20white.png" 
                        alt="Ladies Planet Graphic Logo"
                        style={{ height: '28px', filter: isLightMode ? 'invert(1)' : 'none' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                </div>

                {/* Nav Links */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    {NAV.map(({ to, icon: Icon, label, exact }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={exact}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none',
                                color: isActive ? 'var(--white)' : 'var(--muted)',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                transition: 'color 0.2s',
                                borderBottom: isActive ? '2px solid var(--white)' : '2px solid transparent',
                                paddingBottom: '4px',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {Icon && <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />}
                                    {label}
                                </>
                            )}
                        </NavLink>
                    ))}
                    
                    <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'none', border: 'none', color: 'var(--muted)',
                            cursor: 'pointer', transition: 'color 0.2s', padding: '4px'
                        }}
                    >
                        {isLightMode ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
                    </button>

                    <button 
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--muted)',
                            fontSize: '13px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            cursor: 'pointer',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                    >
                        <LogOut size={16} strokeWidth={1.5} />
                        Sign Out
                    </button>
                </nav>
            </header>

            {/* ── Main Content Area ── */}
            <main style={{ flex: 1, padding: '40px 60px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
