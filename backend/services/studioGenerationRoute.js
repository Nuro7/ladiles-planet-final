// One trusted decision point for video provider and reference handling.
const ROUTES = Object.freeze({
  ultrafast: Object.freeze({ provider: 'higgsfield-mcp', model: 'grok_video_v15', balanceVerified: false }),
  budget: Object.freeze({ provider: 'higgsfield-mcp', model: 'wan3_0_prime', balanceVerified: true }),
  premium: Object.freeze({ provider: 'higgsfield-mcp', model: 'wan3_0_prime', balanceVerified: true }),
  custom: Object.freeze({ provider: 'higgsfield-mcp', model: 'wan3_0_prime', balanceVerified: true }),
  flagship: Object.freeze({ provider: 'higgsfield-mcp', model: 'hf_mult_motion_control', balanceVerified: true }),
});

function resolve(tier, generationMode = 'speed') {
  const route = ROUTES[tier];
  if (!route) throw new Error('This creation tier is not available. Choose Budget or Premium.');
  if (!['speed', 'balance'].includes(generationMode)) throw new Error('Choose Speed or Balance.');
  return { ...route, tier, generationMode: tier === 'ultrafast' ? 'speed' : generationMode, useReferenceVideo: tier !== 'ultrafast' && generationMode === 'balance' };
}

function enforce(route, options, sourceVideo) {
  if (route.tier === 'ultrafast') options = {...options,model:'grok_video_v15',generationMode:'speed',referenceImageUrl:null,referenceImagePaths:[]};
  // Quick mode is a fixed low-cost preview route. Never allow a client-side
  // payload to silently turn it into a 720p/1080p generation.
  if (route.tier === 'budget') options = { ...options, resolution: '480p' };
  if (!route.useReferenceVideo) {
    return { ...options, sourceVideoUrl: null, sourceVideoPath: null, sourceVideoAsset: null,
      flowProjectUrl: null, useSourceAudio: false };
  }
  if (!sourceVideo && !options.sourceVideoUrl && !options.sourceVideoPath && !options.sourceVideoAsset)
    throw new Error('Balance needs a saved or uploaded reference video.');
  return options;
}

module.exports = { resolve, enforce };
