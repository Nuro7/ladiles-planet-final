// Keep actionable owner instructions, but never expose browser internals or
// terminal control codes to the boutique's client.
function studioErrorMessage(error, fallback = 'Creation could not be completed. Recover the saved request or try again.') {
  const message = String(error?.message || error || '').replace(/\u001b\[[0-9;]*m/g, '');
  if (/string_too_long/i.test(message) && /prompt/i.test(message)) {
    const limit = message.match(/at most\s+(\d+)\s+characters/i)?.[1];
    return `The video model rejected this prompt because it is too long${limit ? ' (maximum ' + Number(limit).toLocaleString('en-US') + ' characters)' : ''}. An approved shorter prompt is needed. Your saved prompt is unchanged.`;
  }
  if (/The finished tile is no longer in the grid|The media is still in Flow/i.test(message))
    return 'Google returned a result, but its download could not be completed. Recover this saved request to retrieve the existing video; do not start another generation.';
  if (/locator\.|getByRole\(|getByText\(|Call log:|outside of the viewport|Target.*closed|Execution context.*destroyed/i.test(message))
    return 'The creation browser could not finish preparation. Your uploads are saved. Recover / retry this creation; the owner may need to reopen the project.';
  if (/stack trace|\bat .*\.(?:js|ts):\d|ECONNRESET|ETIMEDOUT/i.test(message)) return fallback;
  return message || fallback;
}
module.exports = { studioErrorMessage };
