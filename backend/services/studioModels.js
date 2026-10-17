// Verified against the connected Higgsfield MCP models_explore catalog.
const videoModels = [
  { id: 'wan3_0_prime', label: 'Wan 3.0 Prime', resolutions: ['480p', '720p', '1080p'], minDuration: 2, maxDuration: 30, followsSource: false },
  { id: 'seedance_2_5', label: 'Seedance 2.5 Edit', resolutions: ['480p', '720p', '1080p'], minDuration: 4, maxDuration: 30, followsSource: true },
];
function videoModel(id = 'wan3_0_prime') {
  const model = videoModels.find(item => item.id === id);
  if (!model) throw new Error('Choose Wan 3.0 Prime or Seedance 2.5 Edit.');
  return model;
}
module.exports = { videoModels, videoModel };
