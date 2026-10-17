function itemsFrom(response) {
  const value = response?.items || response?.generations || response?.results || response?.data?.items || response?.data?.results || response?.data;
  return Array.isArray(value) ? value : response?.id ? [response] : [];
}
function failureFor(job) {
  if (!job) return null;
  const status = String(job.status || job.state || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const failed = /^(failed|failure|error|cancelled|canceled|rejected|blocked|nsfw|moderated|copyright|ip_detected|copyright_violation|content_policy_violation|content_rejected|moderation_failed|generation_failed|failed_generation|failed_moderation|failed_copyright)$/.test(status);
  if (!failed) return null;
  const detail = job.error_message || job.failure_reason || job.rejection_reason || job.error || job.results?.error_message || job.results?.error || job.message;
  const message = typeof detail === 'string' ? detail : detail?.message || detail?.reason || detail?.detail;
  const error = new Error(message || (status === 'ip_detected' ? 'Higgsfield rejected this generation: intellectual-property/copyright content detected (ip_detected). No automatic retry was submitted.' : `Higgsfield stopped this generation (${status}).`));
  error.code = 'PROVIDER_JOB_REJECTED';
  error.providerStatus = status;
  return error;
}
module.exports = { itemsFrom, failureFor };
