import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';

const API = import.meta.env.VITE_API_URL || '/api';
async function ownerHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: 'Bearer ' + session.access_token } : {};
}

export default function EngineConnection() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const response = await fetch(`${API}/higgsfield-oauth/status`, { cache: 'no-store', headers: await ownerHeaders() });
      if (!response.ok) throw new Error('Connection status is unavailable. Check that the backend is running.');
      const result = await response.json();
      setStatus(result.data);
      setError('');
    } catch (cause) {
      setError(cause.message);
      setStatus(null);
    }
  }

  useEffect(() => { refresh(); }, []);

  const expired = status?.expires_at && Date.now() >= Number(status.expires_at);
  const connected = Boolean(status?.connected && !expired);

  async function disconnect() {
    if (!window.confirm('Disconnect this Higgsfield account from Ladies Planet? Your saved creations will remain.')) return;
    setBusy(true);
    try {
      const response = await fetch(`${API}/higgsfield-oauth/disconnect`, { method: 'POST', headers: await ownerHeaders() });
      if (!response.ok) throw new Error('Could not disconnect. Please retry.');
      await refresh();
    } catch (cause) { setError(cause.message); }
    finally { setBusy(false); }
  }

  async function connect() {
    setBusy(true);
    try {
      const response = await fetch(`${API}/higgsfield-oauth/authorize-url`, { method: 'POST', headers: await ownerHeaders() });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Could not start owner connection.');
      window.location.href = result.url;
    } catch (cause) { setError(cause.message); setBusy(false); }
  }

  return <section className="creation-engine" aria-label="AI engine connection">
    <div>
      <strong>AI Engine connection</strong>
      <span>{error || (status === null ? 'Checking connection…' : connected ? 'Higgsfield account authorized' : expired ? 'Previous account expired — connect your new account' : 'No account connected')}</span>
    </div>
    <div className="creation-engine__actions">
      {status?.connected && <button type="button" onClick={disconnect} disabled={busy}>Disconnect old account</button>}
      <button type="button" className="creation-engine__connect" onClick={connect} disabled={busy}>{connected ? 'Reconnect AI Engine' : 'Connect AI Engine'}</button>
      <button type="button" onClick={refresh} disabled={busy}>Refresh status</button>
    </div>
  </section>;
}
