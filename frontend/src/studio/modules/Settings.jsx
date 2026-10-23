import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, LogOut } from 'lucide-react';
import StudioLayout from '../StudioLayout';
import { Button, NativeSelect } from '../primitives';
import { getStudioConfig, getStudioConnections, updateStudioDefaults } from '../../api/studioVideo';
import { useAuth } from '../../context/AuthContext';
import EngineConnection from '../experience/EngineConnection.jsx';
import '../creationStudio.css';
export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [config, setConfig] = useState(null);
  const [values, setValues] = useState({});
  const [connections, setConnections] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; getStudioConfig().then(value => { if (alive) { setConfig(value); setValues(value.defaults); } }).catch(err => { if (alive) setError(err.message); }); getStudioConnections(false).then(value => { if (alive) setConnections(value); }).catch(err => { if (alive) setError(err.message); }); return () => { alive = false; }; }, []);
  async function refresh() { setBusy(true); setError(''); try { setConnections(await getStudioConnections(true)); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  async function save() { setBusy(true); setError(''); try { setValues(await updateStudioDefaults(values)); localStorage.removeItem('lp_creation_preferences'); window.dispatchEvent(new Event('lp:studio-config-changed')); setMessage('Defaults saved. New creations use these choices.'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  const change = (name, value) => setValues(previous => ({ ...previous, [name]: value }));
  const header = <div className="s-modhead"><div><div className="s-eyebrow">Owner setup</div><h1 className="s-modhead__title">Settings</h1><p className="s-modhead__sub">Set defaults before the bride arrives.</p></div></div>;
  const canvas = <div className="creation-library" style={{ maxWidth: 760 }}><section className="s-card" style={{ padding: 24, marginBottom: 20 }}><h2>Quick creation defaults</h2><p className="creation-muted">The scene is already chosen, so the client only adds people and a dress.</p>{config && <div className="creation-custom__settings">
    <label>Quality<NativeSelect value={values.tier} onChange={event => change('tier', event.target.value)} options={config.tiers.map(item => ({ id: item.id, label: item.label }))} /></label>
    <label>Scene<NativeSelect value={values.scene} onChange={event => change('scene', event.target.value)} options={config.scenes.map(item => ({ id: item.id, label: item.label }))} /></label>
    <label>Workflow<NativeSelect value={values.mode} onChange={event => change('mode', event.target.value)} options={[{ id: 'standard', label: 'Standard · review first' }, { id: 'vip', label: 'VIP · parallel' }]} /></label>
    <label>People<NativeSelect value={values.subjectMode} onChange={event => change('subjectMode', event.target.value)} options={[{ id: 'solo', label: 'Bride only' }, { id: 'couple', label: 'Bride & groom' }]} /></label>
  </div>}<Button variant="gold" disabled={busy || !config} onClick={save}>Save defaults</Button></section>
    <section className="s-card" style={{ padding: 24, marginBottom: 20 }}><h2>Creation connections</h2><EngineConnection />{!connections ? <p role="status">Checking connections…</p> : <><p>Budget: {connections.budget.message}</p><p>Premium: {connections.premium.configured ? 'Credentials configured; generation not yet verified' : 'Owner credentials required'}</p><p>Flagship: {connections.flagship.configured ? 'Credentials configured; generation not yet verified' : 'Owner credentials required'}</p><p>Images: {connections.images.connected ? 'Saved login found; generation not yet verified' : 'Owner reconnection required'}</p></>}<p className="creation-muted">Only the owner reconnects accounts. Budget uses a dedicated server browser, not the client's phone. Credentials stay on the server; never paste them into a prompt.</p><Button disabled={busy} onClick={refresh}><RefreshCw size={14} /> Recheck connections</Button></section>
    <section className="s-card" style={{ padding: 24 }}><h2>Account</h2><p>{user?.email || 'Local preview session'}</p>{user ? <Button onClick={async () => { try { await logout(); navigate('/login'); } catch (err) { setError(err.message); } }}><LogOut size={14} /> Sign out</Button> : <Button onClick={() => navigate('/login')}>Sign in</Button>}<p className="creation-muted">Animations respect your device's reduced-motion preference.</p></section>
    {message && <p role="status" className="creation-notice">{message}</p>}{error && <p role="alert" className="film-error">{error}</p>}
  </div>;
  return <StudioLayout header={header} canvas={canvas} />;
}
