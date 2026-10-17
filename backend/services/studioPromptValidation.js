function validateVideoPrompt(options, output = 'video') {
  if (output === 'image') return;
  const model = options.tier === 'budget' ? 'wan3_0_prime' : options.model || 'wan3_0_prime';
  const length = Array.from(String(options.prompt || '')).length;
  if (model === 'wan3_0_prime' && length > 5000) {
    const error = new Error(`Wan 3.0 Prime allows 5,000 prompt characters; this template has ${length.toLocaleString('en-US')}. Use an approved shorter prompt before generating. Your saved prompt has not been changed. No image or video generation was submitted.`);
    error.code = 'PROMPT_TOO_LONG';
    throw error;
  }
}
module.exports = { validateVideoPrompt };
