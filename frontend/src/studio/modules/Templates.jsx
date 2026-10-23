import { useEffect, useState } from 'react';
import { User, Users, Settings2, Image, Film } from 'lucide-react';
import StudioLayout from '../StudioLayout';
import StudioModal from '../experience/StudioModal';
import { Button } from '../primitives';
import FilmPlayer from '../experience/FilmPlayer';
import { getStudioTemplates, updateStudioTemplate } from '../../api/studioVideo';
import '../filmStudio.css';
import '../creationStudio.css';
export default function Templates() {
  const [scenes, setScenes] = useState([]);
  const [tier, setTier] = useState('shared');
  const [subject, setSubject] = useState('solo');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let alive = true; getStudioTemplates(tier).then(items => { if (alive) setScenes(items); }).catch(err => { if (alive) setError(err.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [tier]);
  function edit(scene) { setEditing({ ...scene, subject }); setValues({ prompt: scene.subjects[subject].prompt, imagePrompt: scene.subjects[subject].imagePrompt, useSourceAudio: scene.subjects[subject].useSourceAudio, sourceVideoAsset: scene.subjects[subject].sourceVideoAsset || '', flowProjectUrl: scene.subjects[subject].flowProjectUrl || '' }); setFiles({}); setError(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await updateStudioTemplate(editing.id, editing.subject, values, files, tier);
      setScenes(await getStudioTemplates(tier)); setEditing(null);
      window.dispatchEvent(new Event('lp:studio-config-changed'));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const change = (name, value) => setValues(previous => ({ ...previous, [name]: value }));
  const recipe = editing?.subjects[editing.subject];
  const header = <div className="s-modhead"><div><div className="s-eyebrow">Owner setup</div><h1 className="s-modhead__title">Scene Library</h1><p className="s-modhead__sub">Set image and video recipes once. Clients simply choose a scene.</p></div><div className="creation-choice">{[['solo', 'Bride only', User], ['couple', 'Bride & groom', Users]].map(([id, label, icon]) => { const Icon = icon; return <button key={id} aria-pressed={subject === id} className={subject === id ? 'is-selected' : ''} onClick={() => setSubject(id)}><Icon size={15} />{label}</button>; })}</div></div>;
  const canvas = <div className="creation-library"><div className="creation-choice" role="group" aria-label="Template quality"><button aria-pressed={tier === 'shared'} className={tier === 'shared' ? 'is-selected' : ''} onClick={() => { if (tier !== 'shared') { setLoading(true); setTier('shared'); } }}>Premium & Flagship</button><button aria-pressed={tier === 'budget'} className={tier === 'budget' ? 'is-selected' : ''} onClick={() => { if (tier !== 'budget') { setLoading(true); setTier('budget'); } }}>Budget</button></div><p className="creation-muted">Each quality has saved scenes with separate Bride only and Bride & groom recipes. Upload reference clips and music here.</p>
    {loading && <p role="status">Loading scene recipes…</p>}{error && !editing && <p className="film-error" role="alert">{error}</p>}
    <div className="film-scene-grid">{scenes.map((scene, index) => <article key={scene.id} className={'film-scene film-scene--' + index % 4}><div className="film-scene__art">{scene.subjects[subject].previewUrl ? <img src={scene.subjects[subject].previewUrl} alt="Illustrated scene" /> : subject === 'couple' ? <Users size={32} /> : <Image size={32} />}<small>{scene.subjects[subject].hasReferenceVideo ? 'Reference clip ready' : 'Recipe only'}</small></div><div className="film-scene__copy"><strong>{scene.subjects[subject].label || scene.label}</strong><p>{scene.subjects[subject].description || scene.description}</p><span>{scene.subjects[subject].hasMusic ? 'Music attached' : 'No fixed music'} · v{scene.subjects[subject].version}</span><Button onClick={() => edit(scene)}><Settings2 size={14} /> Set prompts & references</Button></div></article>)}</div>
  </div>;
  return <><StudioLayout header={header} canvas={canvas} />{editing && <StudioModal title={(recipe.label || editing.label) + ' · ' + (editing.subject === 'couple' ? 'Bride & groom' : 'Bride only')} onClose={() => { if (!busy) setEditing(null); }} wide><form onSubmit={save}>
    <p className="creation-muted">Identity and dress references are added automatically. Source clips guide camera movement; exact likeness and transition matching still need review.</p>
    <label>Image recipe<textarea required minLength={5} maxLength={30000} value={values.imagePrompt} onChange={event => change('imagePrompt', event.target.value)} /></label>
    <label>Video recipe<textarea required minLength={5} maxLength={['BRIDAL_REFERENCE_10', 'BRIDAL_REFERENCE_11', 'BRIDAL_REFERENCE_12', 'BRIDAL_REFERENCE_14'].includes(recipe.templateId) ? 40000 : 30000} value={values.prompt} onChange={event => change('prompt', event.target.value)} /></label>
    {recipe.referenceImageUrl && <img style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain' }} src={recipe.referenceImageUrl} alt="Saved scene reference" />}
    <label>Reference photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFiles(previous => ({ ...previous, referenceImage: event.target.files[0] }))} /></label>
    {recipe.referenceImageUrl && <label className="creation-check"><input type="checkbox" checked={Boolean(values.removeImage)} onChange={event => change('removeImage', event.target.checked ? 'true' : '')} /> Remove saved photo</label>}
    {recipe.sourceVideoUrl && <FilmPlayer src={recipe.sourceVideoUrl} title="Reference video" />}
    {tier === 'budget' && <div className="creation-custom">
      <p className="creation-muted">Reuse an already uploaded clip: open its project in the dedicated Flow browser, then enter its exact title below. Saving verifies the clip before linking it. Leave blank to use the saved file upload.</p>
      <label>Saved Flow clip title<input value={values.sourceVideoAsset || ''} onChange={event => change('sourceVideoAsset', event.target.value)} placeholder="Exact video title in Flow" disabled={busy} /></label>
      <label>Flow project link<input type="url" value={values.flowProjectUrl || ''} onChange={event => change('flowProjectUrl', event.target.value)} placeholder="Paste the project browser address" disabled={busy} /></label>
    </div>}
    <label><Film size={14} /> Reference video (first {tier === 'budget' && editing.id === 'indoor' ? '10' : '8'} seconds are used)<input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={event => setFiles(previous => ({ ...previous, sourceVideo: event.target.files[0] }))} /></label>
    {recipe.hasReferenceVideo && <label className="creation-check"><input type="checkbox" checked={Boolean(values.removeVideo)} onChange={event => { change('removeVideo', event.target.checked ? 'true' : ''); if (event.target.checked) change('useSourceAudio', false); }} /> Remove saved clip</label>}
    <label>Exact music track<input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/ogg" onChange={event => setFiles(previous => ({ ...previous, music: event.target.files[0] }))} /></label>
    <label className="creation-check"><input type="checkbox" checked={values.useSourceAudio || false} onChange={event => change('useSourceAudio', event.target.checked)} disabled={!files.sourceVideo && (!recipe.hasReferenceVideo || values.removeVideo === 'true')} /> Use reference video audio (a separate track takes priority)</label>
    {recipe.hasMusic && <label className="creation-check"><input type="checkbox" checked={Boolean(values.removeMusic)} onChange={event => change('removeMusic', event.target.checked ? 'true' : '')} /> Remove saved separate music track</label>}
    <p className="creation-muted">Use only media you have permission to reuse, and obtain consent for both people's photos. Files: photos under 10 MB; videos and music under 100 MB.</p>
    {error && <p className="film-error" role="alert">{error}</p>}<Button type="submit" variant="gold" disabled={busy}>{busy ? 'Preparing and saving…' : 'Save scene recipe'}</Button>
  </form></StudioModal>}</>;
}
