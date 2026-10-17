import { useEffect, useState } from 'react';
import { Search, Shirt, Check, RefreshCw } from 'lucide-react';
import { getDressGallery, getRecentDresses } from '../../api/studioVideo';
import { Button } from '../primitives';
import StudioModal from './StudioModal';

export default function DressPicker({ selectedId, onSelect, onClose }) {
  const [dresses, setDresses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab,setTab] = useState('gallery');
  function load() {
    setLoading(true); setError('');
    (tab === 'recent' ? getRecentDresses() : getDressGallery()).then(setDresses).catch(err => setError(err.message)).finally(() => setLoading(false));
  }
  useEffect(() => { let alive = true; const fetchItems=()=> (tab === 'recent' ? getRecentDresses() : getDressGallery()).then(value => { if (alive) {setDresses(value);setLoading(false);} }).catch(err => { if (alive) {setError(err.message);setLoading(false);} }); fetchItems(); const timer=setInterval(fetchItems,5000); return () => { alive = false;clearInterval(timer); }; }, [tab]);
  function chooseTab(value) {setLoading(true);setError('');setDresses([]);setTab(value);}
  const shown = dresses.filter(dress => dress.isAvailable && [dress.name, dress.sku, dress.category].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  return <StudioModal title="Choose a dress" onClose={onClose} wide>
    <p className="creation-muted">Tap a dress to attach all its saved views.</p>
    <div className="creation-choice"><Button onClick={()=>chooseTab('gallery')}>Dress Gallery</Button><Button onClick={()=>chooseTab('recent')}>Recent Uploads</Button></div>
    <label className="creation-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or stock code" aria-label="Search dresses" /></label>
    {loading && <p role="status" className="creation-muted">Loading the wardrobe…</p>}
    {error && <div role="alert"><p className="film-error">{error}</p><Button onClick={load}><RefreshCw size={14} /> Try again</Button></div>}
    {!loading && !error && !shown.length && <div className="creation-empty"><Shirt size={32} /><h3>No dresses found</h3><p>Add stock in Dress Gallery, or upload dress photos directly in Studio.</p></div>}
    <div className="wardrobe-grid">{shown.map(dress => <button className="wardrobe-card" key={dress.id} onClick={() => { onSelect(dress); onClose(); }}>
      <img src={dress.thumbnailUrl || dress.imageUrl} alt={dress.name} loading="lazy" />
      <div className="wardrobe-card__copy"><strong>{dress.name}</strong><span>{dress.images?.length || 1} views · {dress.sku}</span><small>{dress.flowSync?.message || 'Not synced to Flow'}</small>{selectedId === dress.id && <Check size={15} />}</div>
    </button>)}</div>
  </StudioModal>;
}
