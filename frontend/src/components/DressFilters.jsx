import { Search, X, ArrowUpDown } from 'lucide-react';

const DRESS_CATEGORIES = [
    'Bridal Gown', 'Evening Gown', 'Cocktail Dress',
    'Traditional', 'Contemporary', 'Lehenga', 'Saree', 'Anarkali', 'Other',
];

export default function DressFilters({ filters, onFilterChange }) {
    const set = (key, val) => onFilterChange({ ...filters, [key]: val });

    const reset = () => onFilterChange({
        category: '', availability: '', search: '', sortBy: 'created_at', sortOrder: 'desc',
    });

    const hasActive = filters.category || filters.availability !== '' || filters.search;

    return (
        <div className="card" style={{ padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={14} color="var(--text-3)" strokeWidth={1.8}
                        style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={e => set('search', e.target.value)}
                        placeholder="Search dresses…"
                        className="input"
                        style={{ paddingLeft: 36 }}
                    />
                </div>

                {/* Category */}
                <select value={filters.category} onChange={e => set('category', e.target.value)} className="input" style={{ width: 160 }}>
                    <option value="">All Categories</option>
                    {DRESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {/* Availability */}
                <select value={filters.availability} onChange={e => set('availability', e.target.value)} className="input" style={{ width: 140 }}>
                    <option value="">All Status</option>
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                </select>

                {/* Sort + direction */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={filters.sortBy} onChange={e => set('sortBy', e.target.value)} className="input" style={{ width: 130 }}>
                        <option value="created_at">Date Added</option>
                        <option value="name">Name</option>
                        <option value="category">Category</option>
                        <option value="updated_at">Last Updated</option>
                    </select>
                    <button
                        onClick={() => set('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="btn btn-ghost btn-sm"
                        title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        style={{ flexShrink: 0 }}
                    >
                        <ArrowUpDown size={14} strokeWidth={1.8}
                            style={{ transform: filters.sortOrder === 'asc' ? 'scaleY(1)' : 'scaleY(-1)', transition: 'transform 0.2s' }} />
                    </button>
                    {hasActive && (
                        <button onClick={reset} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, gap: 5, color: 'var(--accent)' }}>
                            <X size={13} /> Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
