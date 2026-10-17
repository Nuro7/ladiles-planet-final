/**
 * HistoryModule.jsx — every generation you've made, wired to the live history
 * endpoints (image history + generated videos). Filter by type, hover to
 * download, click to open.
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, ImageOff, History as HistoryIcon, Play } from 'lucide-react';
import StudioLayout from '../StudioLayout';
import EmptyState from '../experience/EmptyState';
import { Segmented, Skeleton } from '../primitives';
import { getImageHistory, downloadFile } from '../../api/bridalImage';
import { getStudioHistory } from '../../api/studioVideo';
import { formatElapsed } from '../experience/elapsedTime';
import FilmPlayer from '../experience/FilmPlayer';
import hiddenHistoryItems from '../historyHiddenItems.json';
import '../historyMetadata.css';

const API = import.meta.env.VITE_API_URL || '/api';
function HistoryDetails({item}) {
  const m=item.metadata || {};
  const rows=[['Model',m.model],['Mode',m.mode],['Prompt / template',m.template?.replace(/-/g,' ')],['Prompt characters',m.promptCharacters==null?null:m.promptCharacters.toLocaleString()],['Character limit',m.promptLimit],['Quality',m.resolution],['Video length',m.duration?m.duration+'s':null],['Frame',m.aspectRatio],['Generation time',item.elapsedMs!=null?formatElapsed(item.elapsedMs):null]];
  return <div className="history-metadata"><strong>Generation details</strong><dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl><small>{m.source || 'Historical record'}</small></div>;
}

export default function HistoryModule() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [failed, setFailed] = useState(() => new Set());
  const [selectedFilm, setSelectedFilm] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [imgs, vids, creations, showcases] = await Promise.all([
        getImageHistory().catch(() => []),
        fetch(`${API}/videos?type=generated`).then((r) => r.json()).then((j) => j?.data || []).catch(() => []),
        getStudioHistory().catch(() => []),
        fetch(`${API}/videos/studio/showcases`).then((r) => r.json()).then((j) => j?.data || []).catch(() => []),
      ]);
      if (!alive) return;
      const legacyMetadata=v=>({model:v.model || null,template:v.template_name || v.scenario || null,resolution:v.resolution || null,duration:v.duration || null,aspectRatio:v.aspect_ratio || null,promptCharacters:typeof v.prompt==='string'?Array.from(v.prompt).length:null,source:'Historical database record'});
      const images = (imgs || []).map((v) => ({ id: `i-${v.id}`, kind: 'image', url: v.video_url || v.url, at: v.created_at,metadata:legacyMetadata(v) }));
      const videos = (Array.isArray(vids) ? vids : []).map((v) => ({ id: `v-${v.id}`, kind: 'video', url: v.video_url || v.videoUrl, at: v.created_at,metadata:legacyMetadata(v) }));
      const studioItems = creations.flatMap(job => ['image', 'video'].filter(kind => job[kind].status === 'ready' && job[kind].url).map(kind => ({ id: job.id + '-' + kind, creation: job.id, kind, url: job[kind].url, status: job[kind].status, message: job[kind].message, elapsedMs: job[kind].elapsedMs, at: job.createdAt,metadata:job.historyMetadata?.[kind] })));
      const verified = showcases.map(item => ({ ...item, at: item.createdAt }));
      const hiddenUrls = new Set(studioItems.filter(item => hiddenHistoryItems.includes(item.id)).map(item => item.url));
      setItems([...verified, ...studioItems, ...videos, ...images].filter((item, index, all) => item.url && !hiddenHistoryItems.includes(item.id) && !hiddenUrls.has(item.url) && all.findIndex(other => other.url === item.url) === index).sort((a, b) => String(b.at).localeCompare(String(a.at))));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const shown = useMemo(() => items.filter((i) => (filter === 'all' || i.kind === filter) && !failed.has(i.url)), [items, filter, failed]);

  const header = (
    <div className="s-modhead">
      <div>
        <div className="s-eyebrow">Library</div>
        <h1 className="s-modhead__title" style={{ marginTop: 4 }}>History</h1>
        <div className="s-modhead__sub">{loading ? 'Loading…' : `${shown.length} generation${shown.length === 1 ? '' : 's'}`}</div>
      </div>
      <div style={{ minWidth: 240 }}>
        <Segmented value={filter} onChange={setFilter}
          options={[{ id: 'all', label: 'All' }, { id: 'image', label: 'Posters' }, { id: 'video', label: 'Films' }]} />
      </div>
    </div>
  );

  let canvas;
  if (loading) {
    canvas = (
      <div style={{ padding: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} style={{ aspectRatio: '3/4' }} />)}
      </div>
    );
  } else if (shown.length === 0) {
    canvas = (
      <EmptyState icon={HistoryIcon} title="Nothing here yet"
        sub="Posters and films you generate will collect here — download, revisit, or send them straight to a bride."
        hints={['Generate a poster', 'Render a film']} />
    );
  } else {
    canvas = (
      <div style={{ padding: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {shown.map((it) => (
          <div key={it.id} tabIndex={0} className="s-card s-card--hover history-card" aria-label={'Generation details: '+(it.title || it.metadata?.template || it.kind)} style={{ overflow: 'hidden', position: 'relative', aspectRatio: '3/4' }}>
            {!it.url ? <div style={{ padding: 22 }}><HistoryIcon size={28} /><h3>{it.status === 'generating' || it.status === 'queued' ? 'In progress' : 'Needs attention'}</h3><p>{it.message}</p><a className="s-btn" href={'/studio/cinematic?creation=' + encodeURIComponent(it.creation)}>Open saved creation</a></div> : it.kind === 'video' ? (
              <button type="button" onClick={() => setSelectedFilm(it)} aria-label={`Play ${it.title || 'film'}`}
                style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', border: 0, padding: 0, background: '#180b0e', cursor: 'pointer' }}>
                <video src={it.url} muted playsInline preload="metadata" onError={() => setFailed((s) => new Set(s).add(it.url))}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', zIndex: 1, display: 'grid', placeItems: 'center', width: 48, height: 48, borderRadius: '50%', color: '#f5d783', background: '#280b13cf', border: '1px solid #d4af6a' }}><Play size={23} fill="currentColor" /></span>
              </button>
            ) : (
              <img src={it.url} alt="" onError={() => setFailed((s) => new Set(s).add(it.url))}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              <span className="s-badge" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', fontSize: 10 }}>
                {it.title || (it.kind === 'video' ? 'Film' : 'Poster')}{it.elapsedMs != null ? ' · ' + formatElapsed(it.elapsedMs) : ''}
              </span>
            </div>
            <HistoryDetails item={it}/>
            {it.url && <button className="s-iconbtn" onClick={() => downloadFile(it.url, `ladies-planet-${it.kind}`)}
              style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', width: 32, height: 32, color: '#fff' }}
              aria-label="Download"><Download size={15} /></button>}
          </div>
        ))}
        {failed.size > 0 && shown.length === 0 && (
          <div style={{ gridColumn: '1 / -1', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <ImageOff size={15} /> Some older links have expired.
          </div>
        )}
      </div>
    );
  }

  return <><StudioLayout header={header} canvas={canvas} />{selectedFilm &&
    <div role="dialog" aria-modal="true" aria-label={selectedFilm.title || 'Film player'}
      onClick={() => setSelectedFilm(null)} style={{ position: 'fixed', zIndex: 1000, inset: 0, display: 'grid', placeItems: 'center', padding: 22, background: '#0b0406e8' }}>
      <div onClick={event => event.stopPropagation()} style={{ width: 'min(1100px, 100%)', maxHeight: 'calc(100vh - 44px)' }}>
        <button type="button" onClick={() => setSelectedFilm(null)} style={{ display: 'block', margin: '0 0 10px auto', padding: '7px 14px', border: '1px solid #cba458', borderRadius: 8, color: '#f3dfa9', background: '#471a22', cursor: 'pointer' }}>Close</button>
        <FilmPlayer src={selectedFilm.url} title={selectedFilm.title || 'Bridal film'} />
      </div>
    </div>}
  </>;
}
