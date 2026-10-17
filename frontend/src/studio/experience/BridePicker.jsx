import { useEffect, useState } from 'react';
import { User, Search } from 'lucide-react';
import { getSavedBrides, uploadSavedBride } from '../../api/studioVideo';
import { Button } from '../primitives';
import StudioModal from './StudioModal';

export default function BridePicker({ currentPhoto, onSelect, onClose }) {
  const [items, setItems] = useState([]), [query, setQuery] = useState(''), [name, setName] = useState('');
  const [busy, setBusy] = useState(true), [error, setError] = useState('');
  useEffect(() => { let alive = true; getSavedBrides().then(value => { if (alive) setItems(value); }).catch(err => { if (alive) setError(err.message); }).finally(() => { if (alive) setBusy(false); }); return () => { alive = false; }; }, []);
  function choose(item) {
    const image = item.images?.find(photo => photo.angle === 'front') || item.images?.[0];
    onSelect({ url: image?.image_url || item.front_image_url || item.image_url, brideId: item.id, brideImageId: image?.id, name: item.name }); onClose();
  }
  async function save() {
    if (!name.trim() || !currentPhoto?.file) return;
    setBusy(true); setError('');
    try {
      const value = await uploadSavedBride(name.trim(), currentPhoto.file);
      choose({ ...value.bride, images: value.images });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const shown = items.filter(item => item.status !== 'archived' && (item.front_image_url || item.image_url) && item.name.toLowerCase().includes(query.toLowerCase()));
  return <StudioModal title="Saved brides" onClose={onClose} wide>
    <p className="creation-muted">Search by name and select the bride’s saved identity photo.</p>
    {currentPhoto?.file && <div className="creation-choice"><input className="creation-search" aria-label="Bride name to save" placeholder="Name this bride, e.g. Remia" maxLength={100} value={name} onChange={event => setName(event.target.value)} /><Button disabled={busy || !name.trim()} onClick={save}>Save bride</Button></div>}
    <label className="creation-bundle-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search bride name" aria-label="Search saved brides" /></label>
    {busy && <p role="status">Loading saved brides…</p>}
    {error && <p className="film-error" role="alert">{error}</p>}
    {!busy && !error && !shown.length && <div className="creation-empty"><User /><p>No saved brides found. Upload a photo, then save it with a name here.</p></div>}
    <div className="wardrobe-grid">{shown.map(item => <button type="button" disabled={busy} className="wardrobe-card" key={item.id} onClick={() => choose(item)}><img src={item.front_image_url || item.image_url} alt={item.name} loading="lazy" /><div className="wardrobe-card__copy"><strong>{item.name}</strong><small>Saved identity photo</small></div></button>)}</div>
  </StudioModal>;
}
