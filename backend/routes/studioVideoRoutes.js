const express = require('express');
const multer = require('multer');
const { tiers } = require('../services/studioVideoConfig');
const video = require('../services/studioVideoService');
const mcp = require('../services/higgsfieldMCPClient');
const templates = require('../services/studioTemplateService');
const experiences = require('../services/studioExperienceService');
const studioAccess = require('../middleware/studioAccess');
const { studioErrorMessage } = require('../utils/studioErrorMessage');
const router = express.Router();
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 12 }, fileFilter(req, file, cb) {
  const allowed = file.fieldname === 'sourceVideo' ? ['video/mp4', 'video/webm', 'video/quicktime']
    : file.fieldname === 'music' ? ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/ogg'] : imageTypes;
  cb(allowed.includes(file.mimetype) ? null : new Error('Choose JPG/PNG/WEBP photos, MP4/MOV/WEBM clips, or MP3/WAV music.'), allowed.includes(file.mimetype));
} });
const imageFields = [{ name: 'brideImage', maxCount: 1 }, { name: 'groomImage', maxCount: 1 }, { name: 'dressImage', maxCount: 1 }, { name: 'dressImages', maxCount: 8 }];
function validateImages(files) {
  for (const entries of Object.values(files || {})) {
    for (const file of entries) if (file.mimetype.startsWith('image/') && file.size > 10 * 1024 * 1024) throw new Error('Each photo must be smaller than 10 MB.');
  }
}
function handle(handler) {
  return async (req, res) => {
    try { await handler(req, res); }
    catch (error) { console.error('[Studio API]', error.message); res.status(400).json({ success: false, error: studioErrorMessage(error) }); }
  };
}
router.get('/config', require('../middleware/security').configLimit, handle(async (req, res) => {
  require('../middleware/mediaAccess').issue(req, res);
  res.set('Cache-Control', 'private, no-store');
  const templateConfig = await templates.publicConfig();
  let ready = false;
  let message = 'Connect the AI Engine to create. No credits are spent until a request is approved.';
  try { const balance = await require('../services/studioBalanceCache').get(); ready = Number.isFinite(Number(balance.credits)); if (ready) message = 'Higgsfield is connected. Paid creation awaits owner approval.'; }
  catch (error) { message = 'Creation service is unavailable. Ask the owner to check the connection.'; }
  const spendEnabled = process.env.HIGGSFIELD_SPEND_ENABLED === 'true';
  res.json({ success: true, data: {
    tiers: tiers.map(({ model, provider, ...tier }) => ({ ...tier, available: ready, connectionMessage: message })),
    premiumModels: require('../services/studioModels').videoModels,
    ...templateConfig, budgetReady: ready, budgetMessage: ready ? 'Connected. Review credits and click Generate to approve this creation.' : message, imagesReady: ready,
  } });
}));
router.get('/connections', studioAccess, handle(async (req, res) => {
  const balance = await require('../services/studioBalanceCache').get();
  const connected = Number.isFinite(Number(balance.credits));
  res.json({ success: true, data: {
    budget: { connected, provider: 'higgsfield-mcp' }, premium: { connected, provider: 'higgsfield-mcp' }, flagship: { connected, provider: 'higgsfield-mcp' },
    ultrafast: { connected, provider: 'higgsfield-mcp' }, custom: { connected, provider: 'higgsfield-mcp' }, images: { connected, provider: 'higgsfield-mcp' },
    message: 'One Higgsfield MCP connection serves all creation tiers.',
  } });
}));
router.get('/templates', studioAccess, handle(async (req, res) => res.json({ success: true, data: await templates.list(req.query.tier || 'shared') })));
// Only this reviewed face-free crop is public; never expose source review frames.
router.get('/template-environment/BUDGET_SPEED_01', (req, res) => {
  res.sendFile(require('node:path').join(__dirname, '..', 'assets', 'budget-speed-01', 'environment-pair.png'));
});
// Only configured thumbnails are exposed. A URL parameter is never interpreted
// as a filesystem path; full source clips and analysis frames stay local.
router.get('/template-thumbnail/:templateId', (req, res) => {
  const config = require('../services/studioVideoConfig');
  const entry = [...require('../services/studioImageTemplates'), ...require('../services/studioUltraFastTemplates'), ...config.flagshipScenes, ...config.budgetSpeedScenes, ...config.budgetScenes, ...config.scenes, ...config.premiumSpeedScenes, ...config.premiumBalanceScenes]
    .flatMap(scene => Object.entries(scene.subjects || {}).map(([subject, recipe]) => ({...recipe, subjectMode:subject})))
    .find(recipe => recipe.templateId === req.params.templateId);
  if (!entry) return res.status(404).json({ success: false, error: 'Template thumbnail not found.' });
  res.set('Cache-Control', 'private, max-age=300');
  res.type('image/svg+xml').send(require('../services/templateArtwork').render(entry));
});
router.put('/defaults', studioAccess, require('../middleware/ownerAccess'), handle(async (req, res) => res.json({ success: true, data: await templates.updateDefaults(req.body) })));
router.put('/templates/:scene/:subject', studioAccess, require('../middleware/ownerAccess'),
  upload.fields([{ name: 'sourceVideo', maxCount: 1 }, { name: 'referenceImage', maxCount: 1 }, { name: 'music', maxCount: 1 }]),
  handle(async (req, res) => {
    validateImages(req.files);
    const tier = req.query.tier || 'shared';
    await templates.update(req.params.scene, req.params.subject, req.body, req.files, tier);
    const scene = (await templates.list(tier)).find(item => item.id === req.params.scene);
    res.json({ success: true, data: scene.subjects[req.params.subject] });
  }));
router.post('/quote', studioAccess, express.json(), handle(async (req, res) => {
  res.json({success:true,data:await require('../services/studioCreditQuote').create(req.body)});
}));
router.post('/custom-reference', studioAccess, upload.single('sourceVideo'), handle(async (req, res) => {
  if (!req.file) throw new Error('Choose a reference video.');
  res.json({ success: true, data: await require('../services/studioCustomReference').stage(req.file) });
}));
router.post('/experiences', studioAccess, upload.fields(imageFields), handle(async (req, res) => {
  validateImages(req.files);
  res.status(202).json({ success: true, data: await experiences.start(req.body, req.files || {}) });
}));
router.get('/experiences', studioAccess, handle(async (req, res) => res.json({ success: true, data: await experiences.list() })));
router.get('/experiences/:id', studioAccess, handle(async (req, res) => {
  const job = await experiences.get(req.params.id);
  res.status(job ? 200 : 404).json(job ? { success: true, data: job } : { success: false, error: 'Creation not found.' });
}));
for (const [action, method] of [['approve-image', 'approve'], ['regenerate-image', 'regenerateImage'], ['retry-video', 'retryVideo'],['upscale','upscaleVideo']]) {
  router.post('/experiences/:id/' + action, studioAccess, handle(async (req, res) => res.json({ success: true, data: await experiences[method](req.params.id) })));
}
// Backwards compatibility for existing callers of the separate prompt endpoint.
router.post('/generate', studioAccess, upload.fields([...imageFields, { name: 'sourceVideo', maxCount: 1 }]), handle(async (req, res) => {
  validateImages(req.files);
  res.status(202).json({ success: true, data: await video.start(req.body, req.files || {}) });
}));
router.get('/media/:id', handle(async (req, res) => {
  const file = req.query.version==='preview' ? await experiences.localVideoFile(req.params.id,'preview') : video.localResults.get(req.params.id) || await experiences.localVideoFile(req.params.id);
  if (!file) return res.status(404).json({ success: false, error: 'Film is unavailable.' });
  res.set('Cache-Control','private, no-store');
  res.sendFile(file);
}));
router.get('/media/:id/image', handle(async (req, res) => {
  const file = await experiences.localImageFile(req.params.id);
  if (!file) return res.status(404).json({success:false,error:'Image is unavailable.'});
  res.set('Cache-Control','private, no-store');
  res.sendFile(file);
}));
// Local, owner-supplied demo films. Explicit IDs only; never use a URL segment
// as a path. The original uploads remain untouched in Downloads.
const showcaseFilms = Object.freeze({
  'higgsfield-69e4f09a': { file: 'film-higgsfield-69e4f09a.mp4', title: 'Bridal film — owner supplied', createdAt: '2026-10-17T04:44:38Z', providerJobId: '69e4f09a-df54-4ed4-8782-a72fe7bf7b8e', imported: true },
  'genjutsu-98ff4752': { file: 'film-genjutsu-98ff4752.mp4', title: 'Flagship wedding film 01', aspectRatio: '9:16', createdAt: '2026-10-16T11:16:56.258Z', providerJobId: '98ff4752-5dde-4181-818e-fbee112260dd', imported: true },
  'genjutsu-69e1043f': { file: 'film-genjutsu-69e1043f.mp4', title: 'Flagship wedding film 02', aspectRatio: '9:16', createdAt: '2026-10-16T09:34:41.817Z', providerJobId: '69e1043f-b85e-4237-900f-192cd71dfbab', imported: true },
  'showcase-courtyard': { file: 'film-showcase-courtyard.mp4', title: 'Verified bridal courtyard showcase', template: 'Courtyard Breeze Portrait', aspectRatio: '16:9' },
  'showcase-sculpted': { file: 'film-showcase-sculpted.mp4', title: 'Sculpted Romance — verified film', template: 'Sculpted Romance', aspectRatio: '9:16' },
});
router.get('/showcases', async (req, res) => {
  let records=new Map();
  if(process.env.NODE_ENV !== 'production') {try {records=await require('../services/studioHistoryMetadata').importedMetadata();} catch(error){console.warn('[History metadata]',error.message);}}
  res.json({ success: true, data: process.env.NODE_ENV === 'production' ? [] : Object.entries(showcaseFilms).map(([id, item]) => ({
  id, kind: 'video', title: item.title, template: item.template, aspectRatio: item.aspectRatio,
  url: '/api/videos/studio/showcase/' + id, createdAt: item.createdAt || '2026-10-15T22:49:00+05:30',
  imported: Boolean(item.imported), providerJobId: item.providerJobId || null,
  metadata: records.get(item.providerJobId) || {template:item.template || null,aspectRatio:item.aspectRatio || null,source:'Local imported video; generation settings not recorded'},
})) });});
router.get('/showcase/:id', (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).json({ success: false, error: 'Showcase film not found.' });
  const item = showcaseFilms[req.params.id];
  if (!item) return res.status(404).json({ success: false, error: 'Showcase film not found.' });
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(require('node:path').join(__dirname, '..', 'data', 'studio-media', item.file));
});
router.use((error, req, res, next) => {
  if (!error) return next();
  res.status(400).json({ success: false, error: error.code === 'LIMIT_FILE_SIZE' ? 'The file is too large. Photos support 10 MB; clips and music support 100 MB.' : error.message });
});
module.exports = router;
