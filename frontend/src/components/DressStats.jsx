import { Package, CheckCircle, AlertCircle, Tag } from 'lucide-react';

export default function DressStats({ stats }) {
    const items = [
        { label: 'Total Dresses', value: stats.total,     icon: Package,       color: 'var(--accent)',  bg: 'var(--accent-light)' },
        { label: 'Available',     value: stats.available, icon: CheckCircle,   color: 'var(--success)', bg: 'var(--success-bg)'   },
        { label: 'Rented Out',    value: stats.rentedOut || stats.unavailable || 0, icon: AlertCircle, color: 'var(--warning)', bg: 'var(--warning-bg)' },
        { label: 'Categories',   value: stats.categories || (stats.byCategory ? Object.keys(stats.byCategory).length : 0), icon: Tag, color: 'var(--text-2)', bg: 'var(--surface-alt)' },
    ];

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: stats.byCategory && Object.keys(stats.byCategory).length > 0 ? 12 : 0 }}>
                {items.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={18} color={color} strokeWidth={1.8} />
                        </div>
                        <div>
                            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 2 }}>{label}</p>
                            <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1 }}>{value ?? 0}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Category breakdown */}
            {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
                <div className="card" style={{ padding: '14px 18px' }}>
                    <p className="label-caps" style={{ marginBottom: 10 }}>By Category</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {Object.entries(stats.byCategory).map(([cat, count]) => (
                            <span key={cat} className="spec-chip">
                                <strong style={{ color: 'var(--accent)', marginRight: 3 }}>{count}</strong>{cat}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
