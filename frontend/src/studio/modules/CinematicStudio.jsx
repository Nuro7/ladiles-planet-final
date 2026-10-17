import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { User, Users, Shirt, Film, Sparkles, Download, Check, RefreshCw, Upload, X, SlidersHorizontal, ArrowRight, FolderOpen, Image as ImageIcon } from 'lucide-react';
import '../filmStudio.css';
import '../creationStudio.css';
import '../guidedStudio.css';
import '../../fashionTypography.css';
import StudioLayout from '../StudioLayout';
import { Button, NativeSelect, TextArea } from '../primitives';
import DressPicker from '../experience/DressPicker';
import BridePicker from '../experience/BridePicker';
import GenerationTiming from '../experience/GenerationTiming.jsx';
import EngineConnection from '../experience/EngineConnection.jsx';
import FilmPlayer from '../experience/FilmPlayer.jsx';
import { promptCatalogNumber, promptTestStatus } from '../templateTestStatus';
import { getStudioConfig, startStudioExperience, getStudioExperience, approveStudioImage, regenerateStudioImage, retryStudioVideo, upscaleStudioVideo, getDressGallery, getRecentDresses } from '../../api/studioVideo';
import { downloadFile } from '../../api/bridalImage';
import { getStudioCreditQuote, uploadCustomReference } from '../../api/studioVideo';

const LAST_JOB = 'lp_studio_experience';
const PREFS = 'lp_creation_preferences';
const VIEW_PREF = 'lp_creation_view';
function readPrefs() { try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch { return {}; } }
const running = state => ['queued', 'generating'].includes(state?.status);
const OUTPUTS = [
  { id: 'image', label: 'Image only', description: 'Create a bridal photograph', icon: ImageIcon },
  { id: 'video', label: 'Video only', description: 'Create a film directly from your photos', icon: Film },
  { id: 'both', label: 'Image + video', description: 'Pair any image and video templates', icon: Sparkles },
];
function ReferenceUpload({ title, step, icon, photos, onFiles, onClear, onGallery, multiple, hint }) {
  const Icon = icon;
  const input = useRef(null);
  const [drag, setDrag] = useState(false);
  return <div className={'creation-upload ' + (drag ? 'is-dragging' : '')}
    onDragOver={event => { event.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
    onDrop={event => { event.preventDefault(); setDrag(false); onFiles(event.dataTransfer.files); }}>
    <div className="creation-upload__head"><span className="creation-step">{step}</span><strong>{title}</strong>{photos.length > 0 && <button type="button" className="s-iconbtn" aria-label={'Clear ' + title} onClick={onClear}><X size={14} /></button>}</div>
    {photos.length ? <div className="creation-photo-preview"><img src={photos[0].url} alt={title} /><span>{photos.length > 1 ? photos.length + ' views attached' : 'Reference added'}</span></div>
      : <button type="button" className="creation-upload__empty" onClick={() => input.current.click()}><Icon size={32} strokeWidth={1.3} /><span>{hint || 'Add a clear reference photo'}</span><small>JPG, PNG or WEBP · 10 MB per photo</small></button>}
    {photos.length > 1 && <div className="creation-view-strip">{photos.map((photo, index) => <img key={photo.url} src={photo.url} alt={photo.angle || 'View ' + (index + 1)} title={photo.angle || 'View ' + (index + 1)} />)}</div>}
    <div className="creation-upload__actions"><Button onClick={() => input.current.click()}><Upload size={14} /> {photos.length ? 'Replace' : 'Upload'}{multiple ? ' photos' : ''}</Button>{onGallery && <Button variant="ghost" onClick={onGallery}><FolderOpen size={14} /> Gallery</Button>}</div>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} hidden aria-label={'Upload ' + title}
      onChange={event => { onFiles(event.target.files); event.target.value = ''; }} />
  </div>;
}
function ResultCard({ title, state, serverNow, kind, onApprove, onRegenerate, onRetry, onUpscale, referencePreviews = [] }) {
  const reduced = useReducedMotion();
  const status = state?.status || 'queued';
  if (status === 'skipped') return null;
  const ready = status === 'ready' && state.url;
  const stageIndex = {validating:0,uploading:1,preparing:2,submitted:3}[state?.stage] ?? (status === 'queued' ? 0 : 2);
  return <Motion.article className="film-result" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    <div className="film-result__head"><span>{title}</span><div style={{display:'flex',alignItems:'center',gap:12}}><small>{ready ? state.isPreview ? '720p preview' : state.quality === '1080p' ? '1080p final' : 'Ready to review' : status === 'awaiting_approval' ? 'Image approval needed' : status === 'blocked' ? 'Waiting for image' : status === 'generating' ? 'Creating' : ['error', 'interrupted'].includes(status) ? 'Needs attention' : 'Queued'}</small>{ready && state.isPreview && <Button variant="gold" disabled={!onUpscale || state.upscaleStatus==='generating'} onClick={onUpscale}><Sparkles size={14} />{state.upscaleStatus==='generating'?'Upscaling…':state.upscaleStatus==='error'?'Retry 1080p upscale':'Upscale to 1080p'}</Button>}</div></div>
    {ready ? kind === 'image' ? <img className="film-result__media" src={state.url} alt="Generated bridal look" /> : <FilmPlayer src={state.url} title={title} />
      : <div className="film-result__placeholder">{running(state) ? <span className="creation-orbit"><Sparkles size={28} /></span> : kind === 'image' ? <User size={34} /> : <Film size={34} />}</div>}
    {running(state) && <div className="creation-wait" aria-hidden="true">
      <div className="creation-wait__glow" />
      {referencePreviews.length ? <span className="creation-wait__refs">{referencePreviews.slice(0, 2).map((reference, index) => <img key={reference.src} src={reference.src} alt={reference.label} title={reference.label} className={index ? 'is-secondary' : ''} />)}</span> : <span className="creation-wait__spark"><Sparkles size={17} /></span>}
      <div className="creation-wait__copy">
        <strong key={kind + status} className="creation-wait__headline">
          {status === 'queued' ? 'Your references are in.' : kind === 'image' ? 'Your bridal look is taking shape.' : 'Your wedding film is being assembled.'}
        </strong>
        <span>{status === 'queued' ? 'We’re waiting for the generation to begin.' : kind === 'image' ? 'Bride and dress details are guiding the look.' : 'The scene, movement and finishing are coming together.'}</span>
      </div>
      <div className="creation-wait__steps">
        <i className="is-done" /><i className={status === 'generating' ? 'is-active' : ''} /><i />
      </div>
    </div>}
    {running(state) && <div className="creation-progress" role="progressbar" aria-label={title + ' progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={state?.progress || undefined}><span style={state?.progress ? { width: state.progress + '%' } : undefined} />{state?.progress > 0 && <small>{state.progress}%</small>}</div>}
    {running(state) && <ol className="creation-stage-list" aria-label="Creation stages">{['Checking references', 'Uploading photos', 'References ready', 'Generation submitted'].map((label,index)=><li key={label} className={index<stageIndex?'is-done':index===stageIndex?'is-active':''} aria-current={index===stageIndex?'step':undefined}><i aria-hidden="true" />{index<stageIndex?'✓ ':''}{label}</li>)}</ol>}
    <p className="film-note" role={running(state) ? 'status' : ['error', 'interrupted'].includes(status) ? 'alert' : undefined}>{state?.message || 'Waiting to start…'}</p>
    <GenerationTiming state={state} serverNow={serverNow} label={kind==='video' && (state.isPreview || state.upscaleStartedAt) ? 'Preview generation time' : undefined} />
    {state?.upscaleStartedAt && <GenerationTiming serverNow={serverNow} label="1080p upscale time" state={{status:state.upscaleStatus==='generating'?'generating':state.upscaleStatus==='done'?'ready':'error',startedAt:state.upscaleStartedAt,finishedAt:state.upscaleFinishedAt,elapsedMs:state.upscaleFinishedAt?Math.max(0,Date.parse(state.upscaleFinishedAt)-Date.parse(state.upscaleStartedAt)):undefined}} />}
    {state?.preparationTimings?.length > 0 && <details className="creation-muted"><summary>Preparation stages</summary>{state.preparationTimings.map((stage,index)=><p key={index}>{stage.name} · {stage.finishedAt ? ((Date.parse(stage.finishedAt)-Date.parse(stage.startedAt))/1000).toFixed(1)+'s' : 'In progress'}</p>)}</details>}
    {ready && !state.isPreview && <div className="film-result__actions">
      {state.url.startsWith('/') ? <a className="s-btn s-btn--ghost" href={state.url} download={'ladies-planet.' + (kind === 'image' ? 'jpg' : 'mp4')}><Download size={14} /> Download</a> : <Button variant="ghost" onClick={() => downloadFile(state.url, 'ladies-planet-' + kind)}><Download size={14} /> Download</Button>}
      {onApprove && <Button variant="gold" onClick={onApprove}><Check size={14} /> Approve & create film</Button>}
      {onRegenerate && <Button variant="ghost" onClick={onRegenerate}><RefreshCw size={14} /> Try another look</Button>}
    </div>}
    {['error', 'interrupted'].includes(status) && onRegenerate && <Button onClick={onRegenerate}>Try image again</Button>}
    {['error', 'interrupted'].includes(status) && onRetry && state?.canRecover !== false && <Button onClick={onRetry}><RefreshCw size={14} /> Check existing film</Button>}
  </Motion.article>;
}

export default function CinematicStudio() {
  const [params] = useSearchParams();
  const reduced = useReducedMotion();
  const [config, setConfig] = useState(null);
  const [tierId, setTier] = useState('budget');
  const [generationMode, setGenerationMode] = useState('balance');
  const [mode, setMode] = useState('standard');
  const [subject, setSubject] = useState('solo');
  const [imageSubject, setImageSubject] = useState('solo');
  const [videoSubject, setVideoSubject] = useState('solo');
  const [custom, setCustom] = useState(false);
  const [sceneId, setScene] = useState('indoor');
  const [imageSceneId, setImageScene] = useState('indoor');
  const [chosenTemplates, setChosenTemplates] = useState({});
  const [bundleSearch, setBundleSearch] = useState('');
  const [bundleLimit, setBundleLimit] = useState(12);
  const [bundleOrderSeed] = useState(() => Math.random().toString(36).slice(2));
  const [output, setOutput] = useState(OUTPUTS.some(item => item.id === params.get('output')) ? params.get('output') : 'both');
  const [prompt, setPrompt] = useState('');
  const [bride, setBride] = useState([]);
  const [groom, setGroom] = useState([]);
  const [dressPhotos, setDressPhotos] = useState([]);
  const [dress, setDress] = useState(null);
  const [duration, setDuration] = useState(8);
  const [resolution, setResolution] = useState('4k');
  const [ratio, setRatio] = useState('9:16');
  const [premiumModel, setPremiumModel] = useState('wan3_0_prime');
  const [customSource, setCustomSource] = useState(null);
  const [sourceUploading, setSourceUploading] = useState(false);
  const [enableThinking, setEnableThinking] = useState(false);
  const sourceInput = useRef(null);
  const [sound, setSound] = useState(true);
  const [imageResolution, setImageResolution] = useState('2k');
  useEffect(() => { if (tierId === 'budget') { setOutput('both'); setGenerationMode('balance'); } }, [tierId]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [creditQuote, setCreditQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [bundleSubmittingAt, setBundleSubmittingAt] = useState(null);
  const [job, setJob] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [guided, setGuided] = useState(true);
  const [dressPicker, setDressPicker] = useState(false);
  const [bridePicker, setBridePicker] = useState(false);
  const studioBody = useRef(null);
  const urls = useRef(new Set());
  const working = busy || running(job?.image) || running(job?.video) || job?.video.upscaleStatus === 'generating';
  const tier = config?.tiers.find(item => item.id === tierId);
  const premiumModels = config?.premiumModels || [];
  const videoResolutions = tierId === 'budget'
    ? ['480p']
    : ['premium', 'custom'].includes(tierId)
      ? premiumModels.find(item => item.id === premiumModel)?.resolutions || ['720p']
    : tier?.resolutions || ['720p', '1080p'];
  const selectedVideoModel = premiumModels.find(item => item.id === premiumModel);
  const sourceControlsOutput = custom && output !== 'image' && selectedVideoModel?.followsSource;
  const customDurations = Array.from({length:(selectedVideoModel?.maxDuration || 30) - (selectedVideoModel?.minDuration || 2) + 1}, (_,i)=>i+(selectedVideoModel?.minDuration || 2));
  useEffect(() => {
    if (config && !videoResolutions.includes(resolution)) setResolution(videoResolutions.includes('720p') ? '720p' : videoResolutions[0]);
  }, [config, tierId, premiumModel, resolution, videoResolutions.join(',')]);
  const visibleScenes = tierId === 'flagship' ? config?.flagshipScenes : tierId === 'budget'
    ? (generationMode === 'speed' ? config?.budgetSpeedScenes : config?.budgetScenes) || config?.scenes
    : (generationMode === 'speed' ? config?.premiumSpeedScenes : config?.premiumBalanceScenes) || config?.scenes;
  const imageScenes = config?.imageScenes || [];
  const recipeIsReady = (assets, kind) => assets?.available !== false && !(tierId === 'budget' && generationMode === 'speed' && !assets?.templateId) && (kind === 'image'
    ? assets?.hasImagePrompt
    : assets?.hasVideoPrompt && (assets?.hasReferenceVideo || assets?.hasReferenceImage));
  const modeNumber = tierId === 'budget' ? generationMode === 'speed' ? 1 : 2 : generationMode === 'speed' ? 3 : 4;
  const templateTestId = (item, templateSubject) => promptCatalogNumber(modeNumber, item.id, templateSubject);
  const testStatus = (kind, templateSubject, assets) => promptTestStatus(kind === 'image' ? 'budget' : tierId, generationMode, kind, templateSubject, assets);
  const templateRecipe = (item, kind) => {
    const requestedSubject = kind === 'video' && tierId === 'flagship' ? 'couple' : output === 'both' ? kind === 'image' ? imageSubject : videoSubject : subject;
    const preferred = item?.subjects?.[requestedSubject];
    if (recipeIsReady(preferred, kind)) return { assets: preferred, subject: requestedSubject };
    if (output === 'both') return null;
    for (const candidate of kind === 'video' && tierId === 'flagship' ? ['couple'] : ['solo']) {
      const assets = item?.subjects?.[candidate];
      if (recipeIsReady(assets, kind)) return { assets, subject: candidate };
    }
    return null;
  };
  const completedScenes = kind => {
    const entries = (kind === 'image' ? imageScenes : visibleScenes)?.map(item => ({ item, recipe: templateRecipe(item, kind) })).filter(entry => entry.recipe && (kind !== 'image' || testStatus('image', entry.recipe.subject, entry.recipe.assets) === 'passed')) || [];
    if (kind !== 'video' || tierId !== 'budget' || generationMode !== 'balance') return entries;
    return entries.sort((a, b) => {
      const passed = entry => testStatus(kind, entry.recipe.subject, entry.recipe.assets) === 'passed';
      const priority = entry => passed(entry) ? entry.item.id === 'sculpted-romance' ? 2 : 1 : 0;
      return priority(b) - priority(a);
    });
  };
  const bundleTemplates = kind => (kind === 'image' ? imageScenes : visibleScenes || []).flatMap(item => ['solo', 'couple'].flatMap(templateSubject => {
    const assets = item?.subjects?.[templateSubject];
    return recipeIsReady(assets, kind) && (kind !== 'image' || testStatus('image', templateSubject, assets) === 'passed') ? [{ item, assets, subject: templateSubject, number: kind === 'image' ? `I.${assets.templateNumber}` : templateTestId(item, templateSubject) }] : [];
  }));
  const bundlePairs = output === 'both' ? bundleTemplates('image').flatMap(imageTemplate =>
    bundleTemplates('video').map(videoTemplate => ({
      imageTemplate, videoTemplate,
      key: `${imageTemplate.item.id}:${imageTemplate.subject}-${videoTemplate.item.id}:${videoTemplate.subject}`,
      imageNumber: imageTemplate.number,
      videoNumber: videoTemplate.number,
    }))) : [];
  const shuffleScore = key => {
    let hash = 2166136261;
    for (const character of bundleOrderSeed + key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return hash >>> 0;
  };
  const soloBundles = bundlePairs.filter(pair => pair.imageTemplate.subject === 'solo' && pair.videoTemplate.subject === 'solo')
    .sort((a, b) => shuffleScore(a.key) - shuffleScore(b.key));
  const featuredSoloKeys = new Set(soloBundles.slice(0, 25).map(pair => pair.key));
  const orderedBundles = [
    ...soloBundles.slice(0, 25),
    ...bundlePairs.filter(pair => !featuredSoloKeys.has(pair.key)).sort((a, b) => shuffleScore(a.key) - shuffleScore(b.key)),
  ];
  const normalizedBundleSearch = bundleSearch.trim().toLowerCase();
  const filteredBundles = normalizedBundleSearch ? orderedBundles.filter(pair => [
    pair.imageTemplate.item.label, pair.imageTemplate.assets?.label, pair.imageTemplate.assets?.description,
    pair.videoTemplate.item.label, pair.videoTemplate.assets?.label, pair.videoTemplate.assets?.description,
    pair.imageTemplate.subject, pair.videoTemplate.subject, pair.imageTemplate.item.category, pair.videoTemplate.item.category,
  ].join(' ').toLowerCase().includes(normalizedBundleSearch)) : orderedBundles;
  const scene = visibleScenes?.find(item => item.id === sceneId);
  const imageScene = imageScenes?.find(item => item.id === imageSceneId);
  const views = dress?.images || dressPhotos;
  const available = (output === 'image' && !custom ? config?.imagesReady : tier?.available) && (output === 'video' || custom || config?.imagesReady);
  const sceneAssets = scene?.subjects?.[output === 'both' ? videoSubject : subject];
  const imageSubjectLabel = imageSubject === 'couple' ? 'Bride & groom' : 'Bride only';
  const videoSubjectLabel = videoSubject === 'couple' ? 'Bride & groom' : 'Bride only';
  const needsGroom = output === 'both' ? imageSubject === 'couple' || videoSubject === 'couple' : subject === 'couple';

  useEffect(() => {
    let alive = true;
    async function initialize() {
      try {
        const value = await getStudioConfig();
        const saved = readPrefs();
        const prefs = { ...value.defaults, ...saved };
        const previous = params.get('creation') || localStorage.getItem(LAST_JOB);
        const restored = previous ? await getStudioExperience(previous).catch(() => { localStorage.removeItem(LAST_JOB); return null; }) : null;
        if (!alive) return;
        setConfig(value); setJob(restored);
        const choice = restored || prefs;
        const activeTier = restored ? choice.tier : value.tiers.find(item => item.id === choice.tier && item.available)?.id || 'budget';
        setTier(activeTier); setMode(choice.mode); setGenerationMode('balance'); setSubject(activeTier === 'flagship' && choice.outputType !== 'image' ? 'couple' : 'solo');
        setImageSubject('solo'); setVideoSubject(activeTier === 'flagship' ? 'couple' : 'solo'); setScene(choice.scene || 'indoor');
        setScene(choice.videoScene || choice.scene || value.budgetScenes?.[0]?.id || 'indoor');
        setImageScene(value.imageScenes?.some(item => item.id === choice.imageScene) ? choice.imageScene : value.imageScenes?.[0]?.id);
        setCustom(activeTier === 'custom'); setPremiumModel('wan3_0_prime');
        const selectedTier = value.tiers.find(item => item.id === activeTier) || value.tiers[0];
        setDuration(selectedTier.duration); setResolution(selectedTier.resolution);
        const selectedOutput = params.get('output') || choice.outputType || 'both';
        if (activeTier === 'budget') setOutput('both');
        else if (OUTPUTS.some(item => item.id === selectedOutput)) setOutput(selectedOutput);
        const dressId = params.get('dress') || prefs.dressId;
        if (dressId) (dressId.startsWith('recent:') ? getRecentDresses() : getDressGallery()).then(items => { if (alive) setDress(items.find(item => item.id === dressId && item.isAvailable) || null); }).catch(() => {});
      } catch (err) { if (alive) setError(err.message); }
    }
    initialize();
    return () => { alive = false; };
  }, [params]);
  useEffect(() => { const previews = urls.current; return () => { for (const url of previews) URL.revokeObjectURL(url); }; }, []);
  useEffect(() => {
    studioBody.current?.parentElement?.scrollTo({ top: 0, behavior: 'auto' });
  }, [output, custom, templateOpen, subject, job?.id, bundleSubmittingAt]);
  useEffect(() => {
    let alive = true;
    const refresh = () => getStudioConfig().then(value => { if (alive) setConfig(value); }).catch(() => {});
    const timer = setInterval(refresh, 15000);
    window.addEventListener('lp:studio-config-changed', refresh);
    return () => { alive = false; clearInterval(timer); window.removeEventListener('lp:studio-config-changed', refresh); };
  }, []);
  useEffect(() => {
    if (!job?.id || !['queued', 'generating'].includes(job.image.status) && !['queued', 'generating'].includes(job.video.status) && job.video.upscaleStatus!=='generating') return undefined;
    let alive = true;
    const timer = setInterval(() => getStudioExperience(job.id).then(value => { if (alive) { setJob(value); setError(''); } }).catch(() => { if (alive) setError('Connection interrupted. Your request is saved; reconnect before starting another generation.'); }), 2500);
    return () => { alive = false; clearInterval(timer); };
  }, [job?.id, job?.image.status, job?.video.status, job?.video.upscaleStatus]);

  function remember(change) {
    localStorage.setItem(PREFS, JSON.stringify({ ...readPrefs(), tier: tierId, mode, generationMode, subjectMode: subject, imageSubjectMode: imageSubject, videoSubjectMode: videoSubject, scene: sceneId, videoScene: sceneId, imageScene: imageSceneId, outputType: output, ...change }));
  }
  function chooseTier(id, isCustom = false) {
    if (job) reset();
    setTemplateOpen(false);
    setChosenTemplates({});
    setCustom(id === 'custom' || isCustom); setTier(id); remember({ tier: id });
    setPremiumModel('wan3_0_prime');
    setImageSubject('solo'); setVideoSubject(id === 'flagship' ? 'couple' : 'solo');
    setSubject(id === 'flagship' && output !== 'image' ? 'couple' : 'solo');
    if (id === 'flagship') setRatio('9:16');
    const choice = config.tiers.find(item => item.id === id);
    setDuration(choice.duration); setResolution(choice.resolution);
    if (id === 'budget') { setOutput('both'); setGenerationMode('balance'); }
    if (id === 'custom') { setOutput('video'); setGenerationMode(customSource ? 'balance' : 'speed'); }
    setError('');
  }
  function chooseOutput(id) {
    if (working || tierId === 'budget') return;
    reset();
    setOutput(id);
    setSubject(tierId === 'flagship' && id !== 'image' ? 'couple' : 'solo');
    remember({ outputType: id });
  }
  function chooseView(value) {
    setGuided(value);
    localStorage.setItem(VIEW_PREF, value ? 'guided' : 'classic');
    setTemplateOpen(false);
    setChosenTemplates({});
  }
  function chooseGuidedVideo(item, assets, templateSubject) {
    if (item.id === 'pure-elegance-landscape') {
      setRatio('16:9');
      setResolution('1080p');
    }
    const nextMode = 'balance';
    setGenerationMode(nextMode);
    remember({ generationMode: nextMode });
    chooseTemplate('video', item.id, templateSubject);
  }
  function chooseTemplate(kind, id, templateSubject) {
    const selectedSubject = templateSubject || subject;
    const nextChosen = { ...chosenTemplates, [kind]: true };
    if (kind === 'image') {
      setImageScene(id); setImageSubject(selectedSubject);
      if (output !== 'both') setSubject(selectedSubject);
      remember({ subjectMode: selectedSubject, imageSubjectMode: selectedSubject, imageScene: id });
    } else {
      setScene(id); setVideoSubject(selectedSubject);
      if (output !== 'both') setSubject(selectedSubject);
      remember({ subjectMode: selectedSubject, videoSubjectMode: selectedSubject, scene: id, videoScene: id });
    }
    setChosenTemplates(nextChosen);
    setError('');
    if (output !== 'both' || nextChosen.image && nextChosen.video) setTemplateOpen(true);
  }
  function chooseBundleSubject(kind, value) {
    if (kind === 'image') setImageSubject(value); else setVideoSubject(value);
    setChosenTemplates(current => ({ ...current, [kind]: false }));
    remember(kind === 'image' ? { imageSubjectMode: value } : { videoSubjectMode: value });
  }
  function chooseBundle(pair) {
    const image = pair.imageTemplate, video = pair.videoTemplate;
    if (video.assets.aspectRatio) setRatio(video.assets.aspectRatio);
    setImageScene(image.item.id); setScene(video.item.id);
    setImageSubject(image.subject); setVideoSubject(video.subject); setSubject(video.subject);
    setChosenTemplates({ image: true, video: true });
    remember({ imageScene: image.item.id, videoScene: video.item.id, scene: video.item.id,
      imageSubjectMode: image.subject, videoSubjectMode: video.subject, subjectMode: video.subject, outputType: 'both' });
    setBundleSearch(''); setBundleLimit(12); setTemplateOpen(true); setError('');
  }
  function selectFiles(kind, input) {
    if (working) return;
    const files = Array.from(input || []);
    const maximum = kind === 'dress' ? 8 : 1;
    if (!files.length) return;
    if (files.length > maximum || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError('Choose up to ' + maximum + ' JPG, PNG or WEBP photos, each smaller than 10 MB.'); return;
    }
    const previous = kind === 'bride' ? bride : kind === 'groom' ? groom : dressPhotos;
    previous.forEach(photo => { URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); });
    const angles = ['front', 'detail', 'side', 'back', 'dupatta', 'blouse', 'full', 'other'];
    const photos = files.map((file, index) => { const url = URL.createObjectURL(file); urls.current.add(url); return { file, url, angle: kind === 'dress' ? angles[index] : undefined }; });
    if (kind === 'bride') setBride(photos);
    else if (kind === 'groom') setGroom(photos);
    else { setDress(null); setDressPhotos(photos); remember({ dressId: null }); }
    setError('');
  }
  function selectDress(value) { setDress(value); setDressPhotos([]); remember({ dressId: value.id }); setError(''); }
  async function selectSource(file) {
    if (!file || working) return;
    if (!['video/mp4','video/webm','video/quicktime'].includes(file.type) || file.size > 100*1024*1024) { setError('Choose an MP4, MOV or WEBM video smaller than 100 MB.'); return; }
    setSourceUploading(true); setCustomSource(null); setError('');
    try {
      const value = await uploadCustomReference(file);
      const previewUrl = URL.createObjectURL(file); urls.current.add(previewUrl);
      setCustomSource({...value, previewUrl}); setGenerationMode('balance');
    } catch (err) { setError(err.message); }
    finally { setSourceUploading(false); }
  }
  async function action(fn) {
    if (!job || busy) return;
    setBusy(true); setError('');
    try { setJob(await fn(job.id)); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function generate() {
    if (working || !custom && !templateOpen) return;
    if (!creditQuote || creditQuote.key !== quoteKey || creditQuote.expiresAt <= Date.now()) {
      setQuoteRefresh(value=>value+1); return;
    }
    setBusy(true); setError('');
    if (output === 'both' && !custom) setBundleSubmittingAt(new Date().toISOString());
    try {
      const created = await startStudioExperience({
        creditQuoteId: creditQuote.id,
        tier: tierId, mode, generationMode: custom ? customSource ? 'balance' : 'speed' : generationMode, subjectMode: output === 'both' ? videoSubject : subject,
        imageSubjectMode: output === 'both' ? imageSubject : subject,
        videoSubjectMode: output === 'both' ? videoSubject : subject,
        scene: sceneId,
        imageScene: imageScene?.id, videoScene: sceneId, outputType: output,
        workflow: custom ? 'prompt' : 'preset', prompt: custom ? prompt : undefined,
        duration, resolution, imageResolution, aspectRatio: ratio, model: tierId === 'flagship' ? 'hf_mult_motion_control' : tierId === 'budget' ? 'wan3_0_prime' : premiumModel, sound, enableThinking, sourceUploadId: custom ? customSource?.id : undefined, dressId: dress?.id?.startsWith('recent:') ? undefined : dress?.id,
        recentDressKey: dress?.id?.startsWith('recent:') ? dress.id.slice(7) : undefined,
        brideId: bride[0]?.brideId, brideImageId: bride[0]?.brideImageId,
      }, { brideImage: bride[0]?.file, groomImage: needsGroom ? groom[0]?.file : undefined, dressImages: dress ? [] : dressPhotos.map(photo => photo.file) });
      setJob(created); localStorage.setItem(LAST_JOB, created.id);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); setBundleSubmittingAt(null); setQuoteRefresh(value=>value+1); }
  }
  function reset() { setTemplateOpen(false); setChosenTemplates({}); setJob(null); setError(''); localStorage.removeItem(LAST_JOB); }
  const enoughPhotos = bride.length > 0 && views.length > 0 && (!needsGroom || groom.length > 0);
  const referenceReady = custom ? output === 'image' || !selectedVideoModel?.followsSource || Boolean(customSource) : output === 'image' || generationMode === 'speed' || Boolean(sceneAssets?.hasReferenceVideo);
  const ready = config && available && referenceReady && !working && !sourceUploading && (custom ? prompt.trim().length >= 5 && (!needsGroom || bride.length > 0 && groom.length > 0) : enoughPhotos);
  const quoteValues = {tier:tierId,mode,generationMode:custom ? customSource ? 'balance' : 'speed' : generationMode,subjectMode:output==='both'?videoSubject:subject,
    imageSubjectMode:output==='both'?imageSubject:subject,videoSubjectMode:output==='both'?videoSubject:subject,
    scene:sceneId,videoScene:sceneId,imageScene:imageSceneId,outputType:output,workflow:custom?'prompt':'preset',
    prompt:custom?prompt:undefined,duration,resolution,imageResolution,aspectRatio:ratio,
    model:tierId === 'flagship' ? 'hf_mult_motion_control' : tierId === 'budget' ? 'wan3_0_prime' : premiumModel,
    sound,enableThinking,sourceUploadId:custom?customSource?.id:undefined};
  const quoteKey = JSON.stringify(quoteValues);
  useEffect(() => {
    let active=true;
    setCreditQuote(null); setQuoteError('');
    if (!config || (!custom && !templateOpen) || custom && (prompt.trim().length < 5 || !referenceReady || sourceUploading) || job || working) return;
    const timer=setTimeout(()=>getStudioCreditQuote(JSON.parse(quoteKey)).then(value=>{
      if(active) setCreditQuote({...value,key:quoteKey});
    }).catch(err=>{if(active)setQuoteError(err.message);}),400);
    const renewal=setTimeout(()=>{if(active)setQuoteRefresh(value=>value+1);},90000);
    return ()=>{active=false;clearTimeout(timer);clearTimeout(renewal);};
  },[quoteKey,quoteRefresh,templateOpen,Boolean(config),job?.id,working,custom,referenceReady,sourceUploading]);

  const header = <div className="s-modhead film-header creation-header">
    <span className="s-eyebrow">Ladies Planet · Creation Studio</span>
    <h1 className="s-modhead__title">A look to remember.</h1>
    <p className="s-modhead__sub">Your people. Your outfit. A wedding story made for them.</p>
    {!guided && <EngineConnection />}
    {!custom && tierId === 'budget' && <label className="creation-model-select">ChatGPT image quality<NativeSelect value={imageResolution} options={[{id:'1k',label:'1K · Medium'},{id:'2k',label:'2K · Medium'}]} onChange={event=>setImageResolution(event.target.value)} disabled={working} /></label>}
    {guided && tierId === 'premium' && output !== 'image' && <label className="creation-model-select">Video model
      <NativeSelect value={premiumModel} options={premiumModels} onChange={event => setPremiumModel(event.target.value)} disabled={working || !config} />
      <small>All Higgsfield-supported qualities for the selected model. Credits update with your selection.</small>
    </label>}
    {guided ? <div className="guided-choices">
      <section><span className="s-eyebrow">01 · What to create</span><div className="guided-options">{OUTPUTS.map(item => <button type="button" key={item.id} className={output === item.id ? 'is-selected' : ''} onClick={() => chooseOutput(item.id)} disabled={working}><strong>{item.id === 'both' ? 'All · image + video' : item.label}</strong><small>{item.id === 'both' ? 'Both start together. See your image first while the film continues.' : item.description}</small></button>)}</div></section>
      <section><span className="s-eyebrow">02 · Choose mode</span><div className="guided-options">{['budget', 'premium', 'flagship', 'custom'].map(id => <button type="button" key={id} className={tierId === id ? 'is-selected' : ''} onClick={() => chooseTier(id)} disabled={working || !config}><strong>{{budget:'Quick',premium:'Premium',flagship:'Flagship',custom:'Custom'}[id]}</strong><small>{{budget:'Everyday bridal creation',premium:'Higher-end bridal film',flagship:'Signature couple motion · Higher cost',custom:'Your prompt · Full control'}[id]}</small></button>)}</div></section>
      {!custom && <section><span className="s-eyebrow">03 · Frame and quality</span><div className="guided-options guided-options--compact">{[['9:16', 'Portrait'], ['16:9', 'Landscape']].map(([id, label]) => <button type="button" key={id} className={ratio === id ? 'is-selected' : ''} onClick={() => setRatio(id)} disabled={working}><strong>{label}</strong><small>{id}</small></button>)}</div>{output !== 'image' && <label className="creation-model-select">Video quality<NativeSelect value={resolution} options={videoResolutions.map(id => ({id,label:id}))} onChange={event => setResolution(event.target.value)} disabled={working || tierId === 'budget'} /></label>}{tierId === 'budget' && output !== 'image' && <p className="creation-muted">Quick uses Wan 3.0 Prime at fixed 480p. Higher quality is available in Premium or Custom.</p>}</section>}
    </div> : <>
    <div className="film-tabs" aria-label="Creation choices">
      {['budget', 'premium', 'flagship'].map(id => {
        const item = config?.tiers.find(value => value.id === id);
        return <button key={id} disabled={!config || working} aria-pressed={!custom && tierId === id} onClick={() => chooseTier(id)} className={'film-tab ' + (!custom && tierId === id ? 'is-selected' : '')}><span>{item?.label || id}</span><small>{item ? item.available ? 'Ready' : id === 'premium' ? 'Verification needed' : 'Reconnect needed' : 'Loading…'}</small></button>;
      })}
      <button disabled={!config || working} aria-pressed={custom} onClick={() => chooseTier('custom')} className={'film-tab ' + (custom ? 'is-selected' : '')}><span>Custom</span><small>Your idea · Your settings</small></button>
    </div>
    {!custom && output !== 'image' && <div className="creation-choice" role="group" aria-label="Video reference mode">
      {[['speed', 'Speed · Photos only'], ['balance', 'Balance · Reference video']].map(([id, label]) => <button key={id} disabled={working} aria-pressed={generationMode === id} className={generationMode === id ? 'is-selected' : ''} onClick={() => { setGenerationMode(id); setTemplateOpen(false); setChosenTemplates({}); remember({ generationMode: id }); }}>{label}</button>)}
    </div>}
    {!custom && <div className="creation-output-choices" role="group" aria-label="What would you like to create?">
      {OUTPUTS.map(item => { const Icon = item.icon; return <Motion.button key={item.id} type="button" disabled={!config || working} aria-pressed={output === item.id} className={'creation-output-card ' + (output === item.id ? 'is-selected' : '')} onClick={() => chooseOutput(item.id)} whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { scale: 0.99 }}>
        <Icon size={23} /><span><strong>{item.label}</strong><small>{item.description}</small></span>{output === item.id && <Check size={16} />}
      </Motion.button>; })}
    </div>}
    </>}
  </div>;

  const results = job ? <div className="film-experience">
    <div className="creation-summary"><div><span className="s-eyebrow">{job.outputType === 'both' ? `Image: ${(job.imageSubjectMode || job.subjectMode) === 'couple' ? 'Bride & groom' : 'Bride only'} · Video: ${(job.videoSubjectMode || job.subjectMode) === 'couple' ? 'Bride & groom' : 'Bride only'}` : job.subjectMode === 'couple' ? 'Bride & groom' : 'Bride only'} · {job.workflow === 'prompt' ? 'Custom' : job.outputType === 'image' ? 'Image only' : job.outputType === 'video' ? 'Video only' : 'Image + video · Combined'}</span><h2>Your creation, all in one place.</h2></div>{!working && <Button variant="ghost" onClick={reset}>New creation <ArrowRight size={14} /></Button>}</div>
    <GenerationTiming state={{ ...job, status: job.finishedAt ? [job.image, job.video].some(part => ['error', 'blocked'].includes(part.status)) ? 'error' : 'ready' : [job.image, job.video].some(part => part.status === 'interrupted') ? 'interrupted' : 'generating' }} serverNow={job.serverNow} overall label={job.video.isPreview || job.video.upscaleStartedAt ? 'Time to preview' : undefined} />
    <div className={'film-result-grid ' + (job.image.status === 'skipped' || job.video.status === 'skipped' ? 'film-result-grid--single' : '')}>
      <ResultCard title="Bridal look" state={job.image} serverNow={job.serverNow} kind="image" referencePreviews={[
        bride[0]?.url && { src: bride[0].url, label: 'Bride reference' },
        views[0]?.url && { src: views[0].url, label: 'Dress reference' },
      ].filter(Boolean)}
        onApprove={!busy && job.video.status === 'awaiting_approval' ? () => action(approveStudioImage) : null}
        onRegenerate={!busy && ['awaiting_approval', 'skipped', 'blocked', 'error', 'interrupted'].includes(job.video.status) ? () => action(regenerateStudioImage) : null} />
      {(job.outputType !== 'both' || ['ready', 'error', 'interrupted', 'blocked'].includes(job.image.status)) && <ResultCard title="Wedding film" state={job.video} serverNow={job.serverNow} kind="video" referencePreviews={[
        bride[0]?.url && { src: bride[0].url, label: 'Bride reference' },
        views[0]?.url && { src: views[0].url, label: 'Dress reference' },
      ].filter(Boolean)} onRetry={!busy ? () => action(retryStudioVideo) : null} onUpscale={!busy && job.video.upscaleStatus!=='generating' ? ()=>action(upscaleStudioVideo) : null} />}
    </div>
    {error && <p className="film-error" role="alert">{error}</p>}
  </div> : bundleSubmittingAt ? <div className="film-experience">
    <div className="creation-summary"><div><span className="s-eyebrow">Image + video · Combined</span><h2>Starting your creation.</h2></div></div>
    <div className="film-result-grid film-result-grid--single">
      <ResultCard title="Bridal look" state={{ status: 'generating', startedAt: bundleSubmittingAt, message: 'Uploading your reference photos and starting image creation…' }} serverNow={bundleSubmittingAt} kind="image" />
    </div>
  </div> : null;

  const form = <Motion.div className={'creation-form' + (custom ? ' creation-form--custom' : '')} initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
    {!config ? <div className="creation-empty"><Sparkles size={30} /><p role="status">{error || 'Preparing Creation Studio…'}</p></div> : <>
      {!custom && <div className="creation-scene-summary">
        <div><span className="s-eyebrow">Your selected templates</span>
          {output !== 'video' && <strong className="creation-selected-template"><ImageIcon size={17} /> Image · {imageScene?.subjects?.[output === 'both' ? imageSubject : subject]?.label || imageScene?.label}</strong>}
          {output !== 'image' && <strong className="creation-selected-template"><Film size={17} /> Video · {sceneAssets?.label || scene?.label}</strong>}
          <span>{output !== 'image' && generationMode === 'balance' && sceneAssets?.hasReferenceVideo ? 'Saved reference clip will be used' : 'Photos only; no reference clip sent'} · {output === 'both' ? `Image: ${imageSubjectLabel} · Video: ${videoSubjectLabel}` : subject === 'couple' ? 'Bride & groom' : 'Bride only'}</span></div>
        <Button variant="ghost" disabled={working} onClick={() => setTemplateOpen(false)}><SlidersHorizontal size={14} /> Back to templates</Button>
      </div>}
      {!guided && tierId === 'premium' && output !== 'image' && <label className="creation-model-select">Premium video model
        <NativeSelect value={premiumModel} options={config.premiumModels || []} onChange={event => setPremiumModel(event.target.value)} disabled={working} />
      </label>}
      {tierId === 'premium' && output !== 'image' && <p className="creation-muted">Template approval in Quick does not verify this Premium model.</p>}
      {!guided && !custom && generationMode === 'speed' && output !== 'image' && <label className="creation-model-select">Video frame
        <NativeSelect value={ratio} options={[{ id: '9:16', label: 'Portrait · 9:16' }, { id: '16:9', label: 'Landscape · 16:9' }]} onChange={event => setRatio(event.target.value)} disabled={working} />
      </label>}
      {!custom && output !== 'image' && <p className="creation-muted">Selected output: {ratio} · {resolution}. Length follows the template.</p>}
      {custom && <div className="creation-custom"><span className="s-eyebrow">Custom creation</span><h2>Your vision, your direction.</h2><label htmlFor="custom-prompt" className="s-label">Prompt</label><TextArea id="custom-prompt" rows={9} maxLength={10000} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Describe your scene, people, dress, motion, camera and lighting. Your prompt is sent exactly as written…" disabled={working} /><small className="creation-muted">{prompt.length.toLocaleString()} / 10,000 characters</small>
        <div className="creation-custom__settings">
          {output !== 'image' && <label>Video model<NativeSelect value={premiumModel} options={premiumModels} onChange={event=>{setPremiumModel(event.target.value);setDuration(10);}} disabled={working} /></label>}
          {output !== 'image' && <label>Duration{sourceControlsOutput ? <span className="custom-source-setting">{customSource ? customSource.duration.toFixed(2) + 's · From reference' : 'Upload reference video'}</span> : <NativeSelect value={duration} options={customDurations.map(value => ({ id: value, label: value + ' seconds' }))} onChange={event => setDuration(Number(event.target.value))} disabled={working} />}</label>}
          {output !== 'image' && <label>Video quality<NativeSelect value={resolution} options={videoResolutions.map(value => ({ id: value, label: value.toUpperCase() }))} onChange={event => setResolution(event.target.value)} disabled={working} /></label>}
          <label>Frame{sourceControlsOutput ? <span className="custom-source-setting">{customSource?.aspectRatio || 'From reference'}</span> : <NativeSelect value={ratio} options={[{id:'9:16',label:'Portrait · 9:16'},{id:'16:9',label:'Landscape · 16:9'}]} onChange={event => setRatio(event.target.value)} disabled={working} />}</label>
          {output !== 'video' && <label>Image model<span className="custom-source-setting">GPT Image 2 · Medium</span></label>}
          {output !== 'video' && <label>Image quality<NativeSelect value={imageResolution} options={[{id:'1k',label:'1K'},{id:'2k',label:'2K'}]} onChange={event=>setImageResolution(event.target.value)} disabled={working}/></label>}
        </div>
        {output !== 'image' && <><label className="creation-check"><input type="checkbox" checked={sound} onChange={event => setSound(event.target.checked)} disabled={working} /> Generate audio</label>{premiumModel === 'wan3_0_prime' && <label className="creation-check"><input type="checkbox" checked={enableThinking} onChange={event=>setEnableThinking(event.target.checked)} disabled={working}/> Thinking · Better prompt adherence, slower generation</label>}</>}
        <p className="creation-muted">Images are optional. Seedance 2.5 Edit requires a video; its duration and frame follow that video.</p>
      </div>}
      {custom && output !== 'image' && <div className="custom-reference-panel"><div className="custom-reference-heading"><div><span className="s-eyebrow">Motion reference</span><h3>Reference video</h3></div>{customSource && <Button variant="ghost" onClick={()=>{setCustomSource(null);setGenerationMode('speed');}} disabled={working}>Remove</Button>}</div>
        {customSource ? <><FilmPlayer src={customSource.previewUrl} title="Custom reference"/><p className="creation-muted">{customSource.name} · {customSource.duration.toFixed(2)}s · {customSource.aspectRatio}</p></> : <div className="custom-reference-empty"><Film size={34}/><strong>{sourceUploading ? 'Preparing your reference…' : 'Add a motion reference'}</strong><span>MP4, MOV or WEBM · Up to 30 seconds · 100 MB</span></div>}
        <Button variant="ghost" disabled={working || sourceUploading} onClick={()=>sourceInput.current?.click()}><Upload size={15}/>{customSource?'Replace video':'Upload reference video'}</Button><input ref={sourceInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={event=>{selectSource(event.target.files?.[0]);event.target.value='';}}/>
      </div>}
      <fieldset className="creation-upload-grid" disabled={working}>
        <ReferenceUpload title={bride[0]?.name || 'Bride'} step="01" icon={User} photos={bride} onFiles={files => selectFiles('bride', files)} onClear={() => setBride([])} onGallery={() => setBridePicker(true)} hint="Upload the bride photo, or choose a saved bride" />
        {needsGroom && <ReferenceUpload title="Groom" step="02" icon={User} photos={groom} onFiles={files => selectFiles('groom', files)} onClear={() => setGroom([])} hint="Upload her groom's photo" />}
        <ReferenceUpload title={dress?.name || 'Dress'} step={needsGroom ? '03' : '02'} icon={Shirt} photos={views} multiple onFiles={files => selectFiles('dress', files)} onClear={() => { setDress(null); setDressPhotos([]); remember({ dressId: null }); }} onGallery={() => setDressPicker(true)} hint="One full-front dress photo required; close-up, side and other views optional (up to 8)" />
      </fieldset>
      {!custom && output === 'both' && <div className="creation-combined-speed">
        <span className="s-label">One click starts both requests</span>
        <p className="creation-muted">This bundle uses Higgsfield MCP for both image and video. The image is shown first; no provider request runs until the owner enables paid creation.</p>
      </div>}
      {!custom && output === 'video' && <p className="creation-muted">Your photos and selected video template go straight to film creation. No generated image or image approval is needed.</p>}
      {!available && <p className="creation-notice" role="status">{tierId === 'budget' && /video rights confirmation/i.test(config.budgetMessage || '')
        ? 'Action needed in the dedicated Google Flow Chrome window: review the “Rights to use this video” dialog and choose your own response. This page checks the connection again automatically; no generation or credits have been used.'
        : tierId === 'budget' ? config.budgetMessage : 'This quality needs the boutique owner to update the account connection.'}</p>}
      {!referenceReady && <p className="creation-notice" role="status">{custom ? 'Upload a reference video to use Seedance 2.5 Edit.' : 'This template needs a saved reference clip. Choose a marked template.'}</p>}
      {error && <p className="film-error" role="alert">{error}</p>}
      <div className="creation-credit-quote" aria-live="polite">
        {output === 'both' && creditQuote?.key === quoteKey && <p>Image: {creditQuote.costs?.image} credits · Video: {creditQuote.costs?.video} credits</p>}
        {creditQuote?.key === quoteKey ? <p>Creation cost: <strong>{creditQuote.credits} credits</strong>. Clicking Generate approves this charge.</p> : <p>{quoteError || (custom && prompt.trim().length < 5 ? 'Write your prompt to see the credit cost.' : !referenceReady ? 'Add the required reference to see the credit cost.' : 'Checking the current credit cost…')}</p>}
        {quoteError && <Button variant="ghost" onClick={()=>setQuoteRefresh(value=>value+1)}>Refresh credit quote</Button>}
      </div>
      <div className="creation-generate">
        <div><span className="s-eyebrow">{custom ? 'Custom' : needsGroom ? '04 / Ready to create' : '03 / Ready to create'}</span><p>{!custom && output === 'image' ? 'Image only' : (tier?.label || '') + ' · ' + (custom ? duration : sceneAssets?.duration || tier?.duration) + 's · ' + resolution?.toUpperCase() + ' · ' + ratio}</p></div>
        <Motion.button className="s-btn s-btn--gold creation-generate__button" disabled={!ready || !creditQuote || creditQuote.key !== quoteKey} onClick={generate} whileHover={reduced ? undefined : { y: -2 }} whileTap={reduced ? undefined : { scale: 0.98 }}><Sparkles size={17} />{busy ? 'Starting your creation…' : output === 'video' ? 'Generate video' : output === 'image' ? 'Generate image' : 'Generate image + video'}{creditQuote?.key === quoteKey && !busy ? ` · ${creditQuote.credits} credits` : ''}</Motion.button>
      </div>
    </>}
  </Motion.div>;

  const templates = <Motion.div className="creation-library" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="creation-summary"><div><span className="s-eyebrow">{tier?.label} templates</span><h2>{output === 'both' ? 'Choose a ready-made bundle.' : 'Choose your ' + output + ' template.'}</h2><p className="creation-muted">{output === 'both' ? 'Each bundle pairs one image prompt with one video prompt. Choose once, upload your references, then generate both together.' : 'Each card shows whether it is for the bride alone or for the couple. Open it and the correct photo fields appear automatically.'}</p></div></div>
    {output === 'both' && <section className="creation-bundle-section" aria-label="Image and video prompt bundles">
      <div className="creation-bundle-toolbar"><span className="creation-bundle-count">{filteredBundles.length.toLocaleString()} bundles · all image/video pairings</span><label className="creation-bundle-search"><ImageIcon size={16} /><input type="search" value={bundleSearch} onChange={event => { setBundleSearch(event.target.value); setBundleLimit(12); }} placeholder="Find a scene or prompt" aria-label="Search bundles" /></label></div>
      {filteredBundles.length ? <div className="creation-bundle-grid">{filteredBundles.slice(0, bundleLimit).map(pair => {
        const image = pair.imageTemplate, video = pair.videoTemplate;
        const audience = value => value.subject === 'couple' ? 'Bride & groom' : 'Bride only';
        const category = value => ({ 'pre-wedding': 'Pre-wedding', wedding: 'Wedding', 'post-wedding': 'Post-wedding' }[value.item.category] || 'Pre-wedding');
        return <Motion.button type="button" key={pair.key} className="creation-bundle-card" whileHover={reduced ? undefined : { y: -3 }} onClick={() => chooseBundle(pair)}>
          <div className="creation-bundle-visuals">
            <div className="creation-bundle-visual">{image.assets.previewUrl ? <img src={image.assets.previewUrl} alt={'Image template preview: ' + (image.assets.label || image.item.label)} loading="lazy" /> : <ImageIcon size={24} />}<span>IMAGE {pair.imageNumber}</span>{testStatus('image', image.subject, image.assets) === 'passed' && <b className="creation-test-badge is-passed"><Check size={12} /> Passed</b>}</div>
            <div className="creation-bundle-join">+</div>
            <div className="creation-bundle-visual">{video.assets.previewUrl ? <img src={video.assets.previewUrl} alt={'Video prompt reference: ' + (video.assets.label || video.item.label)} loading="lazy" /> : <Film size={24} />}<span>VIDEO {pair.videoNumber}</span>{testStatus('video', video.subject, video.assets) === 'passed' && <b className="creation-test-badge is-passed"><Check size={12} /> Passed</b>}</div>
          </div>
          <div className="creation-bundle-copy"><strong>{image.assets.label || image.item.label} + {video.assets.label || video.item.label}</strong>
            <div className="creation-card-labels"><span className="creation-card-label">Image · {category(image)} · {audience(image)}</span><span className="creation-card-label">Video · {category(video)} · {audience(video)}</span></div>
            <p>{image.assets.description || image.item.description} · {video.assets.description || video.item.description}</p>
            <span className="creation-bundle-action">Use this bundle <ArrowRight size={14} /></span>
          </div>
        </Motion.button>;
      })}</div> : <p className="creation-muted">No matching image/video bundles are ready.</p>}
      {filteredBundles.length > bundleLimit && <Button variant="ghost" className="creation-bundle-more" onClick={() => setBundleLimit(value => Math.min(value + 12, filteredBundles.length))}>Show 12 more bundles</Button>}
      {tierId === 'budget' && <div className="guided-template-grid">{visibleScenes?.filter(item=>item.comingSoon).map(item=><button type="button" disabled key={item.id} className="guided-video-card is-coming-soon"><strong>{item.label}</strong><small>Coming soon</small></button>)}</div>}
    </section>}
    {output !== 'both' && (output === 'both' ? ['image', 'video'] : [output]).map(kind => <section key={kind} className="creation-template-section" aria-label={kind === 'image' ? 'Image generation templates' : 'Video generation templates'}>
      <h3>{kind === 'image' ? <ImageIcon size={20} /> : <Film size={20} />}{kind === 'image' ? 'Image generation' : 'Video generation'}<small className="creation-template-count">{completedScenes(kind).length} ready</small>{chosenTemplates[kind] && <span><Check size={14} /> Selected</span>}</h3>
      {output === 'both' && <div className="creation-choice" role="group" aria-label={kind === 'image' ? 'Image subjects' : 'Video subjects'}>{[['solo', 'Bride only'], ['couple', 'Bride & groom']].map(([id, label]) => <button key={id} type="button" aria-pressed={(kind === 'image' ? imageSubject : videoSubject) === id} className={(kind === 'image' ? imageSubject : videoSubject) === id ? 'is-selected' : ''} onClick={() => chooseBundleSubject(kind, id)}>{label}</button>)}</div>}
      {completedScenes(kind).length ? <div className="film-scene-grid creation-scene-picker">{completedScenes(kind).map(({ item, recipe }, index) => {
        const { assets, subject: templateSubject } = recipe;
        const audience = templateSubject === 'couple' ? 'Bride & groom' : 'Bride only';
        return <Motion.button key={item.id + '-' + templateSubject} aria-pressed={Boolean(chosenTemplates[kind]) && item.id === (kind === 'image' ? imageSceneId : sceneId)} className={'film-scene film-scene--' + index % 4 + (chosenTemplates[kind] && item.id === (kind === 'image' ? imageSceneId : sceneId) ? ' is-selected' : '')} whileHover={reduced ? undefined : { y: -4 }} onClick={() => chooseTemplate(kind, item.id, templateSubject)}>
          <div className="film-scene__art">{assets?.previewUrl ? <img src={assets.previewUrl} alt={'Reference moment for ' + (assets?.label || item.label)} loading="lazy" /> : <>{templateSubject === 'couple' ? <Users size={32} /> : kind === 'image' ? <ImageIcon size={32} /> : <Film size={32} />}<span>{String(index + 1).padStart(2, '0')}</span></>}<b className="creation-ai-badge">AI · {templateTestId(item, templateSubject)}</b><b className={'creation-test-badge ' + (testStatus(kind, templateSubject, assets) === 'passed' ? 'is-passed' : 'is-pending')}>{testStatus(kind, templateSubject, assets) === 'passed' ? <><Check size={12} /> Passed</> : 'Not tested'}</b><small>{audience} · {kind === 'video' && assets?.hasReferenceVideo ? 'Reference clip' : kind === 'image' ? 'Image recipe' : 'Video recipe'}</small></div>
          <div className="film-scene__copy"><strong>{assets?.templateNumber ? '#' + assets.templateNumber + ' · ' : ''}{assets?.label || item.label}</strong><div className="creation-card-labels"><span className="creation-card-label">{{'pre-wedding':'Pre-wedding', wedding:'Wedding', 'post-wedding':'Post-wedding'}[item.category] || 'Pre-wedding'}</span><span className="creation-card-label">{audience}</span></div><p>{assets?.description || item.description}</p><small>{kind === 'video' && assets?.sound === false ? (assets.duration || 10) + 's · ' + (assets.aspectRatio === '9:16' ? 'Portrait 9:16' : 'Landscape 16:9') + ' · ' + (assets.hasMusic ? 'Original reference music' : 'No audio') : ''}</small>{assets?.sourceFilename && <p className="creation-source-name" title={assets.sourceFilename}>Reference: {assets.sourceFilename}</p>}<span>{output === 'both' ? 'Choose ' + kind + ' template' : 'Open template'} <ArrowRight size={14} /></span></div>
        </Motion.button>;
      })}</div> : <p className="creation-muted">No completed {kind} templates yet.</p>}
    </section>)}

    {error && <p className="film-error" role="alert">{error}</p>}
  </Motion.div>;

  const guidedTemplates = <div className="guided-library">
    <span className="s-eyebrow">04 · Choose your visual templates</span>
    <h2>{output === 'both' ? 'Choose a bridal look and a film.' : output === 'image' ? 'Choose an image template.' : 'Choose a video template.'}</h2>
    <p className="creation-muted">{tierId === 'flagship' ? 'Choose your wedding scene, then add the bride, groom and dress photos.' : 'Pick a scene, then add the bride and dress photos.'}</p>
    {output !== 'video' && <section className="guided-template-section"><h3><ImageIcon size={18} /> Bridal image {chosenTemplates.image && <Check size={16} />}</h3>
      <div className="guided-template-grid">{completedScenes('image').map(({ item, recipe }) => <button type="button" key={item.id + recipe.subject} className={chosenTemplates.image && imageSceneId === item.id ? 'is-selected' : ''} onClick={() => chooseTemplate('image', item.id, recipe.subject)}>
        <div className="guided-template-art">{recipe.assets.previewUrl ? <img src={recipe.assets.previewUrl} alt="" loading="lazy" /> : <ImageIcon size={28} />}</div><strong>{recipe.assets.label || item.label}</strong><small>{recipe.subject === 'couple' ? 'Bride & groom' : 'Bride only'} · {testStatus('image', recipe.subject, recipe.assets) === 'passed' ? 'Passed' : 'Not tested'}</small>
      </button>)}</div></section>}
    {output !== 'image' && <section className="guided-template-section"><h3><Film size={18} /> Bridal film {chosenTemplates.video && <Check size={16} />}</h3>
      <div className="guided-template-grid">{completedScenes('video').map(({ item, recipe }) => <button type="button" key={item.id + recipe.subject} aria-pressed={Boolean(chosenTemplates.video && sceneId === item.id)} className={'guided-video-card ' + (['courtyard-v2', 'garden-v2', 'royal-garden-v2', 'luxury-bridal-v2', 'elegance-landscape-v2'].includes(recipe.assets.version) ? 'is-prompt-refresh ' : '') + (item.copiedFromQuick || testStatus('video', recipe.subject, recipe.assets) === 'passed' ? 'is-verified' : 'needs-verification') + (chosenTemplates.video && sceneId === item.id ? ' is-selected' : '')} onClick={() => chooseGuidedVideo(item, recipe.assets, recipe.subject)}>
        {['courtyard-v2', 'garden-v2', 'royal-garden-v2', 'luxury-bridal-v2', 'elegance-landscape-v2'].includes(recipe.assets.version) && <span className="prompt-refresh-label">Updated prompt · V2</span>}
        <div className="guided-template-art">{recipe.assets.previewUrl ? <img src={recipe.assets.previewUrl} alt="" loading="lazy" /> : <Film size={28} />}</div><strong>{recipe.assets.label || item.label}</strong><small>{recipe.subject === 'couple' ? 'Bride & groom' : 'Bride only'} · {recipe.assets.hasReferenceVideo ? 'Reference motion' : 'Photos only'} · {recipe.assets.aspectRatio || ratio}</small>
      </button>)}{tierId === 'premium' && visibleScenes?.filter(item=>item.comingSoon).map(item=><button type="button" disabled key={item.id} className="guided-video-card needs-verification is-coming-soon"><div className="guided-template-art">{item.subjects.solo?.previewUrl ? <img src={item.subjects.solo.previewUrl} alt="" loading="lazy" /> : <Film size={28}/>}</div><strong>{item.subjects.solo?.label || item.label}</strong><small>Coming soon</small></button>)}</div></section>}
    {output === 'both' && chosenTemplates.image && chosenTemplates.video && <Button variant="gold" onClick={() => setTemplateOpen(true)}>Continue to photos <ArrowRight size={14} /></Button>}
    {error && <p className="film-error" role="alert">{error}</p>}
  </div>;

  return <>
    <StudioLayout canvas={<div ref={studioBody} className="creation-studio">{header}{results || (!config || custom || templateOpen ? form : tierId === 'budget' ? templates : guided ? guidedTemplates : templates)}</div>} />
    {dressPicker && <DressPicker selectedId={dress?.id} onSelect={selectDress} onClose={() => setDressPicker(false)} />}
    {bridePicker && <BridePicker currentPhoto={bride[0]} onSelect={photo => { setBride([photo]); setError(''); }} onClose={() => setBridePicker(false)} />}

  </>;
}
