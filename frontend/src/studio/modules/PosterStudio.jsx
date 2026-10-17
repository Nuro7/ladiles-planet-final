/**
 * PosterStudio.jsx — flagship #1. Generates luxury bridal posters, wired to the
 * live image API (src/api/bridalImage.js). Uses the studio shell, the couture
 * loader, and the preview canvas (zoom / before-after / fullscreen).
 */
import { useEffect, useRef, useState } from 'react';
import {
  User, Shirt, Image as ImageIcon, Sparkles, Tag, Download, Send, RefreshCw, Printer, Check, QrCode, ChevronRight,
} from 'lucide-react';
import StudioLayout from '../StudioLayout';
import EmptyState from '../experience/EmptyState';
import GeneratingExperience from '../experience/GeneratingExperience';
import PreviewCanvas from '../experience/PreviewCanvas';
import ScanToUpload from '../experience/ScanToUpload';
import ThemePicker from '../experience/ThemePicker';
import { getThemeCover, getThemePrompt } from '../experience/themeFields';
import { POSE_THEMES } from '../experience/themePresets';
import { Section, Label, TextArea, NativeSelect, Segmented, Toggle, UploadCard, MagneticButton, Button } from '../primitives';
import { useUIStore } from '../store';
import AssetPicker from '../../components/AssetPicker';
import {
  getPoses, calculateImageCost, generateImage,
  composeWithLogo, saveCompositedImage, downloadFile,
} from '../../api/bridalImage';

const API = import.meta.env.VITE_API_URL || '/api';
const LOGO_URL = `${API}/images/logo`;

const MODELS = [
  { id: 'google-account', label: 'Connected image studio', supports: [] },
];
const ASPECTS = [
  { id: '3:4', label: 'Poster' }, { id: '1:1', label: 'Square' },
  { id: '9:16', label: 'Story' }, { id: '4:3', label: 'Wide' }, { id: '16:9', label: 'Cinema' },
];
const RESOLUTIONS = [{ id: '1k', label: '1K' }, { id: '2k', label: '2K' }, { id: '4k', label: '4K' }];
const QUALITIES = [{ id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' }];

export default function PosterStudio() {
  const toast = useUIStore((s) => s.toast);

  const [brideImage, setBride] = useState(null);
  const [bridePrev, setBridePrev] = useState(null);
  const [dressImage, setDress] = useState(null);
  const [dressPrev, setDressPrev] = useState(null);

  const [pose, setPose] = useState('front_portrait');
  const [customPrompt, setCustomPrompt] = useState('');
  const [model, setModel] = useState('google-account');
  const [aspectRatio, setAspect] = useState('3:4');
  const [resolution, setResolution] = useState('1k');
  const [quality, setQuality] = useState('medium');
  const [addLogo, setAddLogo] = useState(true);

  const [poses, setPoses] = useState([]);
  const [cost, setCost] = useState({ credits: 0 });
  const [costLoading, setCostLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ pct: 0 });
  const [imageUrl, setImageUrl] = useState(null);
  const [compositedUrl, setCompositedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [picker, setPicker] = useState(null);
  const [scan, setScan] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const costReq = useRef(0);
  const fakeTimer = useRef(null);

  // Backend poses only (the "custom" path is a separate card, not a theme tile),
  // merged with our preset cover/prompt by id; else the built-in starter set.
  const backendPoses = poses.filter((p) => p.id !== 'custom');
  const presetById = Object.fromEntries(POSE_THEMES.map((t) => [t.id, t]));
  const themes = (backendPoses.length ? backendPoses : POSE_THEMES).map((it) => ({ ...presetById[it.id], ...it }));
  const selectedPose = themes.find((p) => p.id === pose) || null;
  const showPrompt = pose === 'custom' || customPrompt.trim().length > 0;
  const pickTheme = (t) => { setPose(t.id); setCustomPrompt(getThemePrompt(t)); setThemeOpen(false); };
  const modelMeta = MODELS.find((m) => m.id === model) || MODELS[0];
  const showRes = modelMeta.supports.includes('resolution');
  const showQuality = modelMeta.supports.includes('quality');
  const displayUrl = compositedUrl || imageUrl;

  useEffect(() => {
    getPoses().then((p) => { setPoses(p); if (p.length && !p.find((x) => x.id === pose)) setPose(p[0].id); }).catch(() => {});
    const last = localStorage.getItem('lp_img_result');
    if (last) setImageUrl(last);
    // Keep the backend history/gallery fresh (surfaced in the History module).
    return () => { clearInterval(fakeTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = ++costReq.current;
    setCostLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await calculateImageCost({ model, aspectRatio, resolution, quality });
        if (id === costReq.current) { setCost(data); setCostLoading(false); }
      } catch { if (id === costReq.current) setCostLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [model, aspectRatio, resolution, quality]);

  const pickFile = (kind) => (file) => {
    const url = URL.createObjectURL(file);
    if (kind === 'bride') { setBride(file); setBridePrev(url); }
    else { setDress(file); setDressPrev(url); }
  };
  const pickGallery = (kind) => (item) => {
    const vf = { _galleryUrl: item.url, name: item.name || 'gallery' };
    if (kind === 'bride') { setBride(vf); setBridePrev(item.url); }
    else { setDress(vf); setDressPrev(item.url); }
  };

  // Smooth the progress bar between coarse states (the image API is one-shot).
  const runFakeProgress = () => {
    clearInterval(fakeTimer.current);
    setProgress({ pct: 6 });
    fakeTimer.current = setInterval(() => {
      setProgress((p) => ({ pct: p.pct < 92 ? p.pct + Math.max(0.6, (92 - p.pct) * 0.045) : p.pct }));
    }, 320);
  };

  const handleGenerate = async () => {
    if (!brideImage) { setError('Upload a bride photo first.'); toast({ variant: 'error', title: 'Bride photo needed', body: 'Add a bride photo to generate a poster.' }); return; }
    if (pose === 'custom' && customPrompt.trim().length < 5) { setError('Write at least 5 characters for the custom pose.'); return; }
    setError(null); setImageUrl(null); setCompositedUrl(null); setGenerating(true);
    runFakeProgress();
    try {
      const res = await generateImage({
        brideImage, dressImage, pose,
        // Send the prompt whenever present — a theme pre-fills an editable prompt.
        customPrompt: customPrompt.trim() ? customPrompt : '',
        model, aspectRatio, resolution, quality,
      });
      const data = res?.data;
      if (!data?.imageUrl) throw new Error('No image URL returned');
      clearInterval(fakeTimer.current); setProgress({ pct: 100 });
      setImageUrl(data.imageUrl);
      localStorage.setItem('lp_img_result', data.imageUrl);

      if (addLogo) {
        try {
          const blob = await composeWithLogo(data.imageUrl, LOGO_URL, { corner: 'top-right', logoScale: 0.18, padding: 0.04, shadow: true });
          setCompositedUrl(URL.createObjectURL(blob));
          saveCompositedImage(blob, data.imageUrl).catch(() => {});
        } catch { /* CORS — skip logo */ }
      }
      toast({ variant: 'success', title: 'Poster ready', body: 'Your bridal poster has been generated.' });
    } catch (err) {
      setError(err.message || 'Generation failed');
      toast({ variant: 'error', title: 'Generation failed', body: err.message || 'Please try again.' });
    } finally {
      clearInterval(fakeTimer.current); setGenerating(false);
    }
  };

  const header = (
    <div className="s-modhead">
      <div>
        <div className="s-eyebrow">Bridal Studio · Poster</div>
        <h1 className="s-modhead__title" style={{ marginTop: 4 }}>Bridal Poster</h1>
        <div className="s-modhead__sub">Turn a bride and a dress into a finished luxury poster.</div>
      </div>
    </div>
  );

  const settings = (
    <>
      <Section label="Bride photo">
        <UploadCard preview={bridePrev} icon={User} label="Upload bride photo" hint="Front-facing portrait works best"
          onFile={pickFile('bride')} onGallery={() => setPicker('bride')} onClear={() => { setBride(null); setBridePrev(null); }} />
        <button className="s-scan-trigger" onClick={() => setScan(true)}>
          <QrCode size={15} /> Scan to upload from phone
        </button>
      </Section>

      <Section label="Dress photo · optional">
        <UploadCard preview={dressPrev} icon={Shirt} label="Upload dress photo"
          onFile={pickFile('dress')} onGallery={() => setPicker('dress')} onClear={() => { setDress(null); setDressPrev(null); }} />
      </Section>

      <Section label="Pose">
        {/* Theme picker trigger — opens the visual pose-theme popup */}
        <button onClick={() => setThemeOpen(true)}
          className={`s-card ${selectedPose ? '' : 's-card--hover'}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', width: '100%', textAlign: 'left', cursor: 'pointer',
            borderColor: selectedPose ? 'var(--gold-line)' : 'var(--border)',
            background: selectedPose ? 'var(--gold-dim)' : 'var(--card)',
          }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--card-2)', display: 'grid', placeItems: 'center' }}>
            {selectedPose && getThemeCover(selectedPose)
              ? <img src={getThemeCover(selectedPose)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <ImageIcon size={18} style={{ color: 'var(--gold)' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: selectedPose ? 'var(--gold-hi)' : 'var(--text)' }}>
              {selectedPose ? selectedPose.label : 'Explore poses'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedPose ? (selectedPose.description || 'Tap to change the pose') : 'Portrait, seated, outdoor & more'}
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        </button>

        {/* Custom prompt card — describe your own pose */}
        <button onClick={() => { setPose('custom'); setCustomPrompt(''); }}
          className={`s-card ${pose === 'custom' ? '' : 's-card--hover'}`}
          style={{
            marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', width: '100%', textAlign: 'left', cursor: 'pointer',
            borderColor: pose === 'custom' ? 'var(--gold-line)' : 'var(--border)',
            background: pose === 'custom' ? 'var(--gold-dim)' : 'var(--card)',
          }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: pose === 'custom' ? 'var(--gold-hi)' : 'var(--text)' }}>Custom prompt</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Describe your own pose</div>
          </div>
          {pose === 'custom' && <Check size={15} style={{ color: 'var(--gold)' }} />}
        </button>

        {/* Editable prompt — shown for custom, or when a theme pre-filled a prompt */}
        {showPrompt && (
          <div style={{ marginTop: 10 }}>
            {pose !== 'custom' && (
              <div style={{ fontSize: 11, color: 'var(--gold)', marginBottom: 6, lineHeight: 1.5 }}>
                Theme prompt — tweak it or leave as is.
              </div>
            )}
            <TextArea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} rows={3}
              placeholder={'A few keywords… e.g. "bride seated, romantic garden, golden light"'} />
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--gold)', lineHeight: 1.5 }}>
              Keywords auto-expand into a full poster direction at generation.
            </div>
          </div>
        )}
      </Section>

      <Section label="Model">
        <NativeSelect value={model} onChange={(e) => setModel(e.target.value)} options={MODELS} />
      </Section>

      <Section label="Aspect ratio">
        <Segmented options={ASPECTS} value={aspectRatio} onChange={setAspect} />
      </Section>

      {showRes && (
        <Section label="Resolution">
          <Segmented options={RESOLUTIONS} value={resolution} onChange={setResolution} />
        </Section>
      )}
      {showQuality && (
        <Section label="Quality">
          <Segmented options={QUALITIES} value={quality} onChange={setQuality} />
        </Section>
      )}

      <Section label="Branding">
        <div className="s-card" style={{ padding: '11px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}><Tag size={15} /> Ladies Planet logo</span>
          <Toggle checked={addLogo} onChange={setAddLogo} />
        </div>
      </Section>
    </>
  );

  const genbar = (
    <>
      <div className="s-genbar__cost">
        <span>{aspectRatio} · {showRes ? resolution.toUpperCase() : 'auto'}{showQuality ? ` · ${quality}` : ''}</span>
        <span className="s-mono" style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={13} /> {costLoading ? '···' : cost.credits ?? 'Account credits'}
          {cost.source === 'engine' && <span title="Exact engine cost" style={{ width: 5, height: 5, borderRadius: 50, background: 'var(--gold)' }} />}
        </span>
      </div>
      <MagneticButton style={{ width: '100%', padding: '14px', fontSize: 14 }}
        disabled={generating || !brideImage} onClick={handleGenerate}>
        {generating ? 'Generating…' : <>Generate poster <Sparkles size={15} /></>}
      </MagneticButton>
      {error && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)', lineHeight: 1.5 }}>{error}</div>}
    </>
  );

  const actions = displayUrl && (
    <>
      {imageUrl && !compositedUrl && (
        <Button variant="ghost" style={{ border: '1px solid var(--border)' }} onClick={async () => {
          try {
            const blob = await composeWithLogo(imageUrl, LOGO_URL, { corner: 'top-right', logoScale: 0.18, padding: 0.04, shadow: true });
            setCompositedUrl(URL.createObjectURL(blob)); saveCompositedImage(blob, imageUrl).catch(() => {});
          } catch (e) { toast({ variant: 'error', title: 'Logo overlay failed', body: e.message }); }
        }}><Tag size={14} /> Add logo</Button>
      )}
      <Button variant="ghost" style={{ border: '1px solid var(--border)' }} onClick={() => window.open(displayUrl, '_blank')}><Printer size={14} /> Print</Button>
      <a className="s-btn s-btn--ghost" style={{ border: '1px solid var(--border)' }} href={`https://wa.me/?text=${encodeURIComponent(displayUrl)}`} target="_blank" rel="noopener"><Send size={14} /> Share</a>
      <Button variant="ghost" style={{ border: '1px solid var(--border)' }} onClick={handleGenerate}><RefreshCw size={14} /> Again</Button>
      <Button variant="gold" onClick={() => downloadFile(displayUrl, 'ladies-planet-poster')}><Download size={14} /> Download</Button>
    </>
  );

  let canvas;
  if (displayUrl && !generating) {
    canvas = <PreviewCanvas type="image" src={displayUrl} beforeSrc={bridePrev} beforeLabel="Bride" afterLabel="Poster" actions={actions} />;
  } else if (generating) {
    canvas = <GeneratingExperience bridePreview={bridePrev} dressPreview={dressPrev} progress={progress} kind="image" />;
  } else {
    canvas = (
      <EmptyState icon={ImageIcon} title="Your bridal poster appears here"
        sub="Upload a bride photo, choose a pose and a look, then generate a finished, print-ready poster."
        hints={['Upload bride', 'Pick a pose', 'Generate']} />
    );
  }

  return (
    <>
      <StudioLayout header={header} canvas={canvas} settings={settings} settingsTitle="Poster settings" genbar={genbar} />
      {themeOpen && (
        <ThemePicker title="Choose a pose" items={themes} selectedId={pose}
          placeholderIcon={ImageIcon} onSelect={pickTheme} onClose={() => setThemeOpen(false)} />
      )}
      {picker && <AssetPicker type={picker} onPick={pickGallery(picker)} onClose={() => setPicker(null)} />}
      {scan && <ScanToUpload onClose={() => setScan(false)}
        title="Scan to add the bride photo"
        onReceive={(url) => { pickGallery('bride')({ url, name: 'phone-upload' }); toast({ variant: 'success', title: 'Photo received', body: 'The phone photo is now the bride photo.' }); }} />}
    </>
  );
}
