const higgsfield = require('./studioHiggsfieldService');

async function generateImage(options, onProgress = () => {}) {
  onProgress(undefined, 'Preparing Higgsfield image references and checking the credit cost…');
  return higgsfield.makeImage(options);
}

module.exports = { generateImage };
