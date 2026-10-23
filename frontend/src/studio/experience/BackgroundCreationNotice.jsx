import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getStudioExperience } from '../../api/studioVideo';
import { BROWSING_CREATION, CREATION_EVENT, LAST_CREATION, OPEN_CREATION_EVENT, isCreationRunning } from './backgroundCreation';
import './backgroundCreation.css';

export default function BackgroundCreationNotice() {
  const { pathname } = useLocation();
  const [job, setJob] = useState(null);
  const [connectionLost, setConnectionLost] = useState(false);
  const [dismissed, setDismissed] = useState(null);

  useEffect(() => {
    let alive = true;
    let pending = false;
    async function refresh() {
      const id = localStorage.getItem(LAST_CREATION);
      if (!id) { if (alive) setJob(null); return; }
      if (pending) return;
      pending = true;
      try {
        const value = await getStudioExperience(id);
        if (alive && localStorage.getItem(LAST_CREATION) === id) {
          setJob(value); setConnectionLost(false);
        }
      } catch { if (alive) setConnectionLost(true); }
      finally { pending = false; }
    }
    function updated(event) {
      setJob(event.detail || null); setConnectionLost(false);
    }
    refresh();
    // Creation Studio already polls its current job. Other library screens
    // keep a read-only monitor; navigation never submits or retries a job.
    const timer = pathname === '/studio/cinematic' ? null : setInterval(refresh, 5000);
    window.addEventListener(CREATION_EVENT, updated);
    window.addEventListener('storage', refresh);
    return () => {
      alive = false; clearInterval(timer);
      window.removeEventListener(CREATION_EVENT, updated);
      window.removeEventListener('storage', refresh);
    };
  }, [pathname]);

  if (!job) return null;
  const active = isCreationRunning(job);
  if (!active && dismissed === job.id) return null;
  const attention = [job.image?.status, job.video?.status].some(status => ['error', 'interrupted', 'awaiting_approval', 'blocked'].includes(status));
  const label = connectionLost ? 'Checking your saved creation—do not resubmit.'
    : active ? 'Your creation is running in the background. You can keep exploring.'
    : attention ? 'Your creation needs attention.' : 'Your creation is ready.';
  return <aside className="background-creation-notice" aria-label="Current creation">
    <span role="status">{label}</span>
    <Link to={'/studio/cinematic?creation=' + encodeURIComponent(job.id)} onClick={() => {
      sessionStorage.removeItem(BROWSING_CREATION);
      window.dispatchEvent(new CustomEvent(OPEN_CREATION_EVENT, { detail: job.id }));
    }}>{active ? 'View progress' : 'View creation'}</Link>
    {!active && <button type="button" onClick={() => setDismissed(job.id)} aria-label="Dismiss creation notice">×</button>}
  </aside>;
}
