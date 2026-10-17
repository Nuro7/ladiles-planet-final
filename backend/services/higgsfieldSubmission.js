const { itemsFrom, failureFor } = require('./higgsfieldJobState');
function detail(value) {
  if (typeof value === 'string') return value;
  return value?.message || value?.reason || value?.detail || value?.description || '';
}
function rejection(response) {
  const failed = failureFor(response);
  if (failed) return failed;
  let message = detail(response?.error) || detail(response?.errors?.[0]);
  if (!message && response?.text) message = detail(response.text);
  if (!message && response?.notice) message = detail(response.notice) || 'Higgsfield requires another choice before it can generate.';
  if (!message && response?.unlim_choice) message = 'Higgsfield requires a billing choice. Open Higgsfield to select the credit source before creating.';
  if (!message && response?.success === false) message = detail(response.message) || 'Higgsfield rejected this request.';
  if (!message) return null;
  const error = new Error(message);
  error.code = 'PROVIDER_REQUEST_REJECTED';
  return error;
}
function submittedJob(response) {
  const job = itemsFrom(response)[0] || response?.job || response?.data?.job || response?.data || response;
  const id = job?.job_id || job?.id || response?.job_id;
  if (!id) {
    const rejected = rejection(response);
    if (rejected) throw rejected;
    const error = new Error('Higgsfield did not confirm a generation ID. This request is saved; check the account before starting another.');
    error.code = 'SUBMISSION_UNCERTAIN';
    throw error;
  }
  // Persist the ID before checking a job-level failure so recovery can find it.
  return { id, job };
}
module.exports = { detail, rejection, submittedJob };
