import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Shirt } from 'lucide-react';
import StudioLayout from '../StudioLayout';
import StudioModal from '../experience/StudioModal';
import { Button } from '../primitives';
import { getDressGallery, getRecentDresses, retryDressSync, saveRecentDress, uploadGalleryDress, addDressPhotos, updateDressViews } from '../../api/studioVideo';
import '../creationStudio.css';
const ANGLES = ['front', 'detail', 'side', 'back', 'dupatta', 'blouse', 'full', 'other'];
function ViewEditor({ views, setViews, cover, setCover }) {
  function move(index, direction) { const next = [...views]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; setViews(next); }
  return <div className="wardrobe-view-editor">{views.map((view, index) => <div className="wardrobe-view-row" key={view.id || view.url}>
    <img src={view.url} alt={view.angle + ' view'} />
    <div><select aria-label={'Angle for photo ' + (index + 1)} value={view.angle} onChange={event => setViews(views.map((item, i) => i === index ? { ...item, angle: event.target.value } : item))}>{ANGLES.map(angle => <option key={angle}>{angle}</option>)}</select>
      <label className="creation-check"><input type="radio" name="cover" checked={cover === view.url} onChange={() => setCover(view.url)} /> Cover photo</label></div>
    <div><button type="button" className="s-iconbtn" disabled={index === 0} aria-label="Move photo earlier" onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button type="button" className="s-iconbtn" disabled={index === views.length - 1} aria-label="Move photo later" onClick={() => move(index, 1)}><ArrowDown size={15} /></button></div>
  </div>)}</div>;
}
export default function Collections() {
  const navigate = useNavigate();
  const [dresses, setDresses] = useState([]);
  const [recent,setRecent] = useState([]);
  const [tab,setTab] = useState('gallery');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [views, setViews] = useState([]);
  const [cover, setCover] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Lehenga');
  const [busy, setBusy] = useState(false);
  const previews = useRef(new Set());
  function reload() { setLoading(true); setError(''); getDressGallery().then(setDresses).catch(err => setError(err.message)).finally(() => setLoading(false)); }
  useEffect(() => { let alive = true; getDressGallery().then(items => { if (alive) setDresses(items); }).catch(err => { if (alive) setError(err.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  useEffect(() => { const urls = previews.current; return () => { for (const url of urls) URL.revokeObjectURL(url); }; }, []);
  useEffect(()=>{let alive=true; const refresh=()=>Promise.all([getDressGallery(),getRecentDresses()]).then(([stock,uploads])=>{if(alive){setDresses(stock);setRecent(uploads);}}).catch(err=>{if(alive)setError(err.message);});refresh();const timer=setInterval(refresh,5000);return()=>{alive=false;clearInterval(timer);};},[]);
  function open(dress) { setError(''); setEditing(dress || {}); setName(dress?.name || ''); setCategory(dress?.category || 'Lehenga'); setViews(dress?.images || []); setCover(dress?.images?.find(view => view.url === dress.imageUrl)?.url || dress?.images?.[0]?.url || ''); }
  function files(input) {
    const chosen = Array.from(input || []);
    if (!chosen.length) return;
    if (views.length + chosen.length > 8 || chosen.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) { setError('Use up to 8 JPG, PNG or WEBP photos, each below 10 MB.'); return; }
    const added = chosen.map((file, i) => { const url = URL.createObjectURL(file); previews.current.add(url); return { file, url, angle: ANGLES[Math.min(views.length + i, 7)] }; });
    setViews([...views, ...added]); if (!cover) setCover(added[0].url); setError('');
  }
  async function save(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      let saved;
      if (editing.id?.startsWith('recent:')) saved = await saveRecentDress(editing.id.slice(7),name.trim(),category);
      else if (!editing.id) saved = await uploadGalleryDress({ name: name.trim(), category, isAvailable: true, views: views.map(view => view.angle), coverIndex: views.findIndex(view => view.url === cover) }, views.map(view => view.file));
      else {
        const added = views.filter(view => view.file);
        saved = added.length ? await addDressPhotos(editing.id, { views: added.map(view => view.angle) }, added.map(view => view.file)) : editing;
        const existing = views.filter(view => !view.file);
        const newViews = saved.images.filter(view => !existing.some(item => item.id === view.id));
        let offset = 0;
        const ordered = views.map(view => view.file ? { ...newViews[offset++], angle: view.angle, previewUrl: view.url } : view);
        const selected = ordered.find(view => (view.previewUrl || view.url) === cover);
        saved = await updateDressViews(editing.id, { images: ordered.map(view => ({ id: view.id, angle: view.angle })), coverId: selected?.id || ordered[0].id });
      }
      setDresses(items => editing.id && !editing.id.startsWith('recent:') ? items.map(item => item.id === saved.id ? saved : item) : [saved, ...items]);
      setEditing(null);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function chooseDress(dress) { localStorage.removeItem('lp_studio_experience'); navigate('/studio/cinematic?dress=' + encodeURIComponent(dress.id)); }
  const shown = (tab==='recent'?recent:dresses).filter(dress => [dress.name, dress.sku, dress.category].some(value => value?.toLowerCase().includes(search.toLowerCase())));
  const header = <div className="s-modhead"><div><div className="s-eyebrow">Boutique wardrobe</div><h1 className="s-modhead__title">Dress Gallery</h1><p className="s-modhead__sub">One dress. Every angle. One tap in Creation Studio.</p></div><Button variant="gold" onClick={() => open(null)}><Plus size={16} /> Add dress</Button></div>;
  const canvas = <div className="creation-library"><div className="creation-library__toolbar"><input className="creation-search" aria-label="Search stock" placeholder="Search dress, category or stock code" value={search} onChange={event => setSearch(event.target.value)} /><span className="creation-muted">{dresses.length} dresses · up to 8 views each</span></div>
    <div className="creation-choice"><Button onClick={()=>setTab('gallery')}>Dress Gallery</Button><Button onClick={()=>setTab('recent')}>Recent Uploads</Button></div>
    <p className="creation-muted">Saving dress photos automatically syncs them to Flow. Wait for “Ready in Flow” before a fast generation. Bride photos are not listed here.</p>
    {error && !editing && <div><p className="film-error" role="alert">{error}</p><Button onClick={reload} disabled={loading}>Try again</Button></div>}{loading && <p role="status">Loading wardrobe…</p>}
    {!loading && !error && !shown.length && <div className="creation-empty"><Shirt size={38} /><h2>Your wardrobe starts here.</h2><p>Add front, back, side and detail photos together.</p></div>}
    <div className="wardrobe-grid">{shown.map(dress => <article className="wardrobe-card" key={dress.id}><button className="wardrobe-open" onClick={() => open(dress)} aria-label={'Manage ' + dress.name}><img src={dress.thumbnailUrl || dress.imageUrl} alt={dress.name} loading="lazy" /><span className="wardrobe-card__count">{dress.images.length} views</span></button><div className="wardrobe-card__copy"><strong>{dress.name}</strong><small>{dress.sku} · {dress.category}</small><small role="status">{dress.flowSync?.message || 'Waiting to sync to Flow'}</small>{dress.flowSync?.status==='attention' && <Button onClick={()=>retryDressSync(dress.flowSync.key).then(reload).catch(err=>setError(err.message))}>Retry Flow sync</Button>}<Button disabled={!dress.isAvailable} onClick={() => chooseDress(dress)}>{dress.isAvailable ? 'Use this dress' : 'Unavailable'}</Button><Button variant="ghost" onClick={() => open(dress)}>{tab==='recent'?'Add to Gallery':'Manage photos'}</Button></div></article>)}</div>
  </div>;
  return <><StudioLayout header={header} canvas={canvas} />{editing && <StudioModal title={editing.id ? editing.name + ' · all views' : 'Add a dress to stock'} onClose={() => { if (!busy) setEditing(null); }}><form onSubmit={save}>
    {(!editing.id || editing.id.startsWith('recent:')) && <><label>Dress name<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label><label>Category<input required maxLength={60} value={category} onChange={event => setCategory(event.target.value)} /></label></>}
    <p className="creation-muted">One full-front photo is enough. Close-up, side and other angles are optional. Label your front photo “front” and choose a cover.</p>
    {editing.id?.startsWith('recent:') ? <p className="creation-muted">All {views.length} saved views will be added unchanged. You can manage their angles and cover after saving to Gallery.</p> : <ViewEditor views={views} setViews={setViews} cover={cover} setCover={setCover} />}
    {views.length < 8 && !editing.id?.startsWith('recent:') && <label>Add photos ({views.length}/8)<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={event => { files(event.target.files); event.target.value = ''; }} /></label>}
    {error && <p className="film-error" role="alert">{error}</p>}<Button type="submit" variant="gold" disabled={busy || !views.length || !name.trim()}>{busy ? 'Saving…' : 'Save dress'}</Button>
  </form></StudioModal>}</>;
}
