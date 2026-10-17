const terminal = new Set(['ready', 'error', 'interrupted', 'blocked', 'skipped']);
const elapsed = (start, end) => Math.max(0, Date.parse(end) - Date.parse(start));

function transitionTiming(previous, changes, now) {
  const next = { ...previous, ...changes };
  if (changes.status === 'generating' && previous.status !== 'generating') {
    if (previous.startedAt) {
      next.attempts = [...(previous.attempts || []), {
        startedAt: previous.startedAt, finishedAt: previous.finishedAt || null,
        elapsedMs: previous.elapsedMs ?? null, status: previous.status,
      }];
    }
    next.startedAt = now;
    delete next.finishedAt;
    delete next.elapsedMs;
  }
  if (changes.status && terminal.has(changes.status) && next.startedAt && !next.finishedAt) {
    next.finishedAt = now;
    next.elapsedMs = elapsed(next.startedAt, now);
  }
  return next;
}

function refreshCreationTiming(job, now) {
  // Overall time includes upload/queue time and Standard's approval wait.
  // A retry opens a new overall end while keeping individual attempt records.
  if (![job.image, job.video].every(part => terminal.has(part.status))) {
    delete job.finishedAt;
    delete job.elapsedMs;
  } else if (job.startedAt && !job.finishedAt) {
    job.finishedAt = now;
    job.elapsedMs = elapsed(job.startedAt, now);
  }
}

module.exports = { transitionTiming, refreshCreationTiming };
