import { useEffect, useState } from 'react';
import { formatElapsed } from './elapsedTime';
function stamp(value) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit',
    minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
  }).format(new Date(value));
}

export default function GenerationTiming({ state, serverNow, overall = false, label }) {
  const [now, setNow] = useState(() => Date.parse(serverNow) || Date.now());
  const active = Boolean(state?.startedAt && !state.finishedAt
    && !['error', 'interrupted', 'blocked', 'skipped', 'ready'].includes(state.status));
  useEffect(() => {
    if (!active) return;
    const anchor = Date.parse(serverNow) || Date.now();
    const tickStart = performance.now();
    // Anchor to the server, not the phone's possibly incorrect wall clock.
    const timer = setInterval(() => setNow(anchor + performance.now() - tickStart), 100);
    return () => clearInterval(timer);
  }, [serverNow, active]);
  if (!state?.startedAt) return null;
  const duration = state.elapsedMs ?? (state.status === 'interrupted' ? null : Math.max(0, now - Date.parse(state.startedAt)));
  const ended = state.finishedAt;
  return <div className="creation-timing">
    <strong>{label || (overall ? 'Total creation time' : 'Generation time')} <span>{duration === null ? 'Unavailable' : formatElapsed(duration)}</span></strong>
    <dl>
      <div><dt>Started</dt><dd><time dateTime={state.startedAt}>{stamp(state.startedAt)}</time></dd></div>
      <div><dt>{['error', 'blocked', 'interrupted'].includes(state.status) ? 'Stopped' : 'Finished'}</dt>
        <dd>{ended ? <time dateTime={ended}>{stamp(ended)}</time> : state.status === 'interrupted' ? 'Interrupted; finish time unavailable' : 'In progress'}</dd></div>
    </dl>
    <small>{overall ? 'Includes uploads, queue, processing and any approval wait.' : 'Includes preparation, queue and final-output processing.'} Times shown in your local time zone.</small>
  </div>;
}
