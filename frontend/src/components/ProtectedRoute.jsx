import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const { loading, isAuthenticated } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg)',
            }}>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                }}>
                    <div style={{
                        width: 32, height: 32,
                        border: '2px solid var(--border)',
                        borderTopColor: 'var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ fontSize: 13, color: 'var(--text-3)', letterSpacing: '0.04em' }}>Loading…</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return <Outlet />;
}
