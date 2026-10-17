import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const [email,     setEmail]     = useState('');
    const [password,  setPassword]  = useState('');
    const [error,     setError]     = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            {/* Subtle background accent */}
            <div aria-hidden style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: '-20%', right: '-10%',
                    width: 500, height: 500, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,115,124,0.07) 0%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-15%', left: '-10%',
                    width: 400, height: 400, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,115,124,0.05) 0%, transparent 70%)',
                }} />
            </div>

            <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>

                {/* Logo slot */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 52, height: 52,
                        borderRadius: 14,
                        background: 'var(--accent-light)',
                        border: '1px solid rgba(168,115,124,0.2)',
                        marginBottom: 16,
                    }}>
                        <span style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 20,
                            color: 'var(--accent)',
                            lineHeight: 1,
                        }}>LP</span>
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 30,
                        fontWeight: 400,
                        color: 'var(--text-1)',
                        marginBottom: 6,
                        letterSpacing: '0.01em',
                    }}>
                        Welcome back
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 400 }}>
                        Staff access · Ladies Planet
                    </p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: '32px 28px' }}>

                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px',
                            borderRadius: 'var(--r)',
                            background: 'var(--error-bg)',
                            border: '1px solid var(--error-border)',
                            marginBottom: 20,
                        }}>
                            <AlertCircle size={16} color="var(--error)" strokeWidth={2} style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: 13, color: 'var(--error)', fontWeight: 400 }}>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        {/* Email */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--text-2)',
                                marginBottom: 6,
                                letterSpacing: '0.02em',
                            }}>
                                Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} strokeWidth={1.8} style={{
                                    position: 'absolute', left: 12, top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-3)', pointerEvents: 'none',
                                }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="boutique@example.com"
                                    className="input"
                                    style={{ paddingLeft: 36 }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--text-2)',
                                marginBottom: 6,
                                letterSpacing: '0.02em',
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} strokeWidth={1.8} style={{
                                    position: 'absolute', left: 12, top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-3)', pointerEvents: 'none',
                                }} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="input"
                                    style={{ paddingLeft: 36 }}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 4 }}
                        >
                            {isLoading
                                ? <Loader2 size={18} className="animate-spin" />
                                : 'Sign in'
                            }
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p style={{
                    textAlign: 'center',
                    marginTop: 20,
                    fontSize: 13,
                    color: 'var(--text-3)',
                }}>
                    No account?{' '}
                    <Link to="/signup" style={{
                        color: 'var(--accent)',
                        fontWeight: 500,
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                    }}>
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
