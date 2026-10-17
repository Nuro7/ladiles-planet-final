import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
    const [name,            setName]            = useState('');
    const [email,           setEmail]           = useState('');
    const [password,        setPassword]        = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error,           setError]           = useState('');
    const [success,         setSuccess]         = useState(false);
    const [isLoading,       setIsLoading]       = useState(false);
    const { register, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) return setError('Passwords do not match');
        if (password.length < 6)          return setError('Password must be at least 6 characters');
        setIsLoading(true);
        try {
            await register(email, password, name);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    const Field = ({ label, icon: Icon, type = 'text', value, onChange, placeholder }) => (
        <div>
            <label style={{
                display: 'block', fontSize: 12, fontWeight: 500,
                color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.02em',
            }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <Icon size={15} strokeWidth={1.8} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-3)', pointerEvents: 'none',
                }} />
                <input
                    type={type} required value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="input"
                    style={{ paddingLeft: 36 }}
                />
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        }}>
            <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute', top: '-20%', right: '-10%',
                    width: 500, height: 500, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,115,124,0.07) 0%, transparent 70%)',
                }} />
            </div>

            <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 52, height: 52, borderRadius: 14,
                        background: 'var(--accent-light)',
                        border: '1px solid rgba(168,115,124,0.2)',
                        marginBottom: 16,
                    }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--accent)', lineHeight: 1 }}>LP</span>
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400,
                        color: 'var(--text-1)', marginBottom: 6, letterSpacing: '0.01em',
                    }}>
                        Create account
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Staff registration · Ladies Planet</p>
                </div>

                <div className="card" style={{ padding: '32px 28px' }}>

                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', borderRadius: 'var(--r)',
                            background: 'var(--error-bg)', border: '1px solid var(--error-border)',
                            marginBottom: 20,
                        }}>
                            <AlertCircle size={16} color="var(--error)" strokeWidth={2} style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: 13, color: 'var(--error)' }}>{error}</p>
                        </div>
                    )}

                    {success && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', borderRadius: 'var(--r)',
                            background: 'var(--success-bg)', border: '1px solid var(--success-border)',
                            marginBottom: 20,
                        }}>
                            <CheckCircle2 size={16} color="var(--success)" strokeWidth={2} style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: 13, color: 'var(--success)' }}>Account created! Redirecting to login…</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Field label="Full name"        icon={User} value={name}            onChange={setName}            placeholder="Your name" />
                        <Field label="Email"            icon={Mail} type="email" value={email} onChange={setEmail}       placeholder="your@boutique.com" />
                        <Field label="Password"         icon={Lock} type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
                        <Field label="Confirm password" icon={Lock} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat password" />

                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 6 }}
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create account'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-3)' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
