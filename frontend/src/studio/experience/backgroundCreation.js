export const LAST_CREATION = 'lp_studio_experience';
export const BROWSING_CREATION = 'lp_studio_browsing_creation';
export const CREATION_EVENT = 'lp:studio-creation-updated';
export const OPEN_CREATION_EVENT = 'lp:studio-creation-open';

export function isCreationRunning(job) {
  return [job?.image?.status, job?.video?.status, job?.video?.upscaleStatus]
    .some(status => ['queued', 'generating'].includes(status));
}

export function canStartCreation(job, busy = false) {
  return !busy && !isCreationRunning(job);
}

export function showCreationResults(job, exploring) {
  return Boolean(job && !exploring);
}
