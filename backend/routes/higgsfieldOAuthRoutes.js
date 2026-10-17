/**
 * higgsfieldOAuthRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OAuth routes for connecting Higgsfield via the same MCP/OAuth flow that
 * Claude Desktop uses — so video generations charge the user's existing
 * app.higgsfield.ai subscription credits.
 *
 * Routes mounted at /api/higgsfield-oauth:
 *   GET   /start              — opens browser-redirect to Higgsfield's authorize page
 *   GET   /callback           — Higgsfield redirects back here with ?code=...&state=...
 *   GET   /status             — JSON: { connected, expires_at, ... }
 *   POST  /disconnect         — clear stored tokens (forces re-auth)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();
const oauth   = require('../services/higgsfieldOAuthService');
const studioAccess = require('../middleware/studioAccess');

// Where the React frontend lives. In dev: Vite on :3001. In prod: same origin.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

function ownerOnly(req, res, next) {
    if (process.env.NODE_ENV !== 'production' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return next();
    if (!process.env.HIGGSFIELD_OWNER_USER_ID || req.user?.id !== process.env.HIGGSFIELD_OWNER_USER_ID)
        return res.status(403).json({ success: false, error: 'Only the account owner can change the AI Engine connection.' });
    next();
}

// ── GET /start — kick off the OAuth flow ─────────────────────
router.get('/start', studioAccess, ownerOnly, async (req, res) => {
    try {
        const authorizeUrl = await oauth.buildAuthorizeUrl();
        console.log('🔐 [OAuth] Redirecting user to Higgsfield authorize page');
        // 302 redirect — browser follows to Higgsfield's login UI
        res.redirect(authorizeUrl);
    } catch (err) {
        console.error('❌ [OAuth] /start error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Authenticated applications use this endpoint because a browser navigation
// cannot attach the staff Bearer token to /start.
router.post('/authorize-url', studioAccess, ownerOnly, async (req, res) => {
    try { res.json({ success: true, url: await oauth.buildAuthorizeUrl() }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /callback — Higgsfield redirects here after user clicks Allow ──
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error: oauthError, error_description } = req.query;

        if (oauthError) {
            return res.status(400).send(`
                <html><body style="font-family:system-ui;padding:40px;background:#1a1a2e;color:#fff;">
                <h2>❌ Higgsfield authorization failed</h2>
                <p>${oauthError}: ${error_description || ''}</p>
                <a href="/api/higgsfield-oauth/start" style="color:#f1c40f">Try again</a>
                </body></html>
            `);
        }

        const result = await oauth.handleCallback({ code, state });

        res.send(`
            <html><body style="font-family:system-ui;padding:40px;background:#1a1a2e;color:#fff;text-align:center;">
            <h1>✅ Higgsfield Connected!</h1>
            <p style="color:#aaa;">Token stored. Expires in ${result.expires_in} seconds (auto-refresh enabled).</p>
            <p>You can close this tab and return to the Ladies Planet app.</p>
            <a href="${FRONTEND_URL}/studio" style="color:#f1c40f;text-decoration:none;padding:12px 24px;background:#6e1f8b;border-radius:8px;display:inline-block;margin-top:20px;">→ Open Studio</a>
            <script>setTimeout(() => { window.location.href = '${FRONTEND_URL}/studio'; }, 2000);</script>
            </body></html>
        `);
    } catch (err) {
        console.error('❌ [OAuth] /callback error:', err.message);
        res.status(500).send(`
            <html><body style="font-family:system-ui;padding:40px;background:#1a1a2e;color:#fff;">
            <h2>❌ Failed to exchange code for tokens</h2>
            <pre style="background:#0f0f1e;padding:16px;border-radius:8px;color:#ff8a80;">${err.message}</pre>
            <a href="/api/higgsfield-oauth/start" style="color:#f1c40f">Try again</a>
            </body></html>
        `);
    }
});

// ── GET /status — returns connection status JSON ──
router.get('/status', studioAccess, ownerOnly, (req, res) => {
    const status = oauth.getConnectionStatus();
    res.json({ success: true, data: status });
});

// ── POST /disconnect — wipe stored tokens ──
router.post('/disconnect', studioAccess, ownerOnly, (req, res) => {
    oauth.disconnect();
    res.json({ success: true, message: 'Disconnected from Higgsfield' });
});

module.exports = router;
