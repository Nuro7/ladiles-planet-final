const express = require('express');
const axios = require('axios');

// Public landing-page clips hosted on Google Drive. Same allowlist as the Vercel
// function in frontend/api/video.js, so this cannot proxy arbitrary Drive files.
const ALLOWED_IDS = new Set([
    '1eF-lRp7i1bfLAUXSus89I_AkwUEUifD1',
    '1pgD5n8c-WMb1ujBrTsanncQaTPzY8Ifk',
    '1L582RHeSPVYg13LrGS149e-rpU5LvAEk',
    '1dOInq0yUq9TOnny82NWNztNwVuy6KOrW',
    '14pV_NRMlsjBB_QSG32QUGSeTd9iv4Td-',
    '17engzF5_ScEQuvNWi5lApGletLONR19t',
]);
const FORWARD_HEADERS = ['content-range', 'accept-ranges', 'content-length', 'content-type'];

const router = express.Router();

// GET/HEAD /api/video?id=<drive file id> — streams the clip, honouring Range for seeking
router.get('/', async (req, res) => {
    const { id } = req.query;
    if (typeof id !== 'string' || !ALLOWED_IDS.has(id)) return res.status(404).end();

    try {
        const response = await axios({
            method: req.method === 'HEAD' ? 'head' : 'get',
            url: `https://drive.usercontent.google.com/download?id=${id}&export=download`,
            headers: req.headers.range ? { range: req.headers.range } : {},
            responseType: 'stream',
            timeout: 15000,
            maxRedirects: 0,
            validateStatus: () => true,
        });

        res.status(response.status);
        for (const header of FORWARD_HEADERS) {
            if (response.headers[header]) res.setHeader(header, response.headers[header]);
        }
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

        if (req.method === 'HEAD') return res.end();
        response.data.pipe(res);
        req.on('close', () => response.data.destroy());
    } catch (err) {
        console.error('[LandingVideo] Drive proxy failed:', err.message);
        if (!res.headersSent) res.status(502).end();
    }
});

module.exports = router;
