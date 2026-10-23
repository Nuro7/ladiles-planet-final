/**
 * higgsfieldOAuthService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HIGGSFIELD MCP — OAuth 2.0 client (with PKCE + Dynamic Client Registration)
 *
 * Mimics how Claude Desktop connects to Higgsfield MCP:
 *   1. Register our backend as an OAuth client (one-time)
 *   2. User clicks "Connect Higgsfield" → opens browser to authorize
 *   3. User logs in to their app.higgsfield.ai account, clicks Allow
 *   4. Higgsfield redirects back with auth code
 *   5. Exchange code for access_token + refresh_token
 *   6. Use access_token to call mcp.higgsfield.ai
 *   7. Auto-refresh when token expires
 *
 * Credit usage: pulls from the user's existing app.higgsfield.ai subscription
 * (Plus/Ultra/Free credits) — NO separate developer billing required.
 *
 * Verified OAuth metadata from mcp.higgsfield.ai/.well-known/oauth-authorization-server:
 *   issuer       : https://mcp.higgsfield.ai
 *   authorize    : https://mcp.higgsfield.ai/oauth2/authorize
 *   token        : https://mcp.higgsfield.ai/oauth2/token
 *   register     : https://mcp.higgsfield.ai/oauth2/register
 *   scopes       : openid, email, offline_access
 *   PKCE         : S256
 *   grants       : authorization_code, refresh_token
 * ─────────────────────────────────────────────────────────────────────────────
 */

const axios  = require('axios');
const crypto = require('crypto');
const { privateJsonStore } = require('../utils/privateJsonStore');
const path   = require('path');

// ─── Storage paths ───────────────────────────────────────────
const DATA_DIR        = process.env.HIGGSFIELD_OAUTH_DATA_DIR || path.join(__dirname, '..', 'data');
const CLIENT_FILE     = path.join(DATA_DIR, 'higgsfield-oauth-client.json');
const TOKEN_FILE      = path.join(DATA_DIR, 'higgsfield-oauth-tokens.json');
const PENDING_FILE    = path.join(DATA_DIR, 'higgsfield-oauth-pending.json');

// ─── OAuth endpoints (verified from .well-known) ─────────────
const OAUTH = {
    AUTHORIZE : 'https://mcp.higgsfield.ai/oauth2/authorize',
    TOKEN     : 'https://mcp.higgsfield.ai/oauth2/token',
    REGISTER  : 'https://mcp.higgsfield.ai/oauth2/register',
    ISSUER    : 'https://mcp.higgsfield.ai'
};

const SCOPES       = 'openid email offline_access';
const CLIENT_NAME  = 'Ladies Planet Bridal Studio';
const REDIRECT_URI = process.env.HIGGSFIELD_OAUTH_REDIRECT_URI
                  || `http://localhost:${process.env.PORT || 5050}/api/higgsfield-oauth/callback`;

class HiggsfieldOAuthService {

    constructor(options = {}) {
        this.storage = privateJsonStore(options.directory || DATA_DIR, options.encryptionKey || process.env.HIGGSFIELD_TOKEN_ENCRYPTION_KEY);
        this.clientFile = path.basename(CLIENT_FILE);
        this.tokenFile = path.basename(TOKEN_FILE);
        this.pendingFile = path.basename(PENDING_FILE);
        this.connectionEpoch = 0;
    }

    _readJson(file) { return this.storage.read(path.basename(file)); }
    _writeJson(file, value) { this.storage.write(path.basename(file), value); }
    _deleteFile(file) { this.storage.remove(path.basename(file)); }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 1 — DYNAMIC CLIENT REGISTRATION (one-time per backend)
    //
    //  POST /oauth2/register with our app metadata. Higgsfield returns a
    //  client_id (and optionally client_secret) we'll use for OAuth.
    // ─────────────────────────────────────────────────────────────────────────
    async ensureClientRegistered() {
        if (!this.registering) this.registering = this._registerClient().finally(() => { this.registering = null; });
        return this.registering;
    }
    async _registerClient() {
        const existing = this._readJson(CLIENT_FILE);
        if (existing?.client_id) {
            console.log(`✓ [HiggsfieldOAuth] Reusing client_id: ${existing.client_id.slice(0, 8)}...`);
            return existing;
        }

        console.log('🔐 [HiggsfieldOAuth] Registering new OAuth client...');
        const res = await axios.post(OAUTH.REGISTER, {
            client_name              : CLIENT_NAME,
            redirect_uris            : [REDIRECT_URI],
            grant_types              : ['authorization_code', 'refresh_token'],
            response_types           : ['code'],
            token_endpoint_auth_method: 'client_secret_post',
            scope                    : SCOPES
        }, {
            headers : { 'Content-Type': 'application/json' },
            timeout : 15000
        });

        const client = res.data;
        if (!client?.client_id) {
            throw new Error('Higgsfield registration returned no client ID.');
        }
        console.log(`✅ [HiggsfieldOAuth] Registered: client_id=${client.client_id.slice(0, 8)}...`);
        this._writeJson(CLIENT_FILE, client);
        return client;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 2 — BUILD AUTHORIZATION URL
    //
    //  Generate PKCE pair + random state, save to pending, return URL.
    //  Frontend redirects the user's browser to this URL.
    // ─────────────────────────────────────────────────────────────────────────
    async buildAuthorizeUrl(ownerId) {
        const client = await this.ensureClientRegistered();

        const codeVerifier  = crypto.randomBytes(64).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
        const state         = crypto.randomBytes(16).toString('hex');

        // Store the verifier + state so the callback can verify them
        const now = Date.now();
        const existing = this._readJson(PENDING_FILE) || {};
        const attempts = Object.fromEntries(Object.entries(existing.attempts || {}).filter(([, item]) => now - item.savedAt < 10 * 60 * 1000));
        if (Object.keys(attempts).length >= 10) throw new Error('Too many pending connections. Wait ten minutes before reconnecting.');
        attempts[state] = { codeVerifier, savedAt: now, ownerId: ownerId || null };
        this._writeJson(PENDING_FILE, { attempts });

        const params = new URLSearchParams({
            response_type         : 'code',
            client_id             : client.client_id,
            redirect_uri          : REDIRECT_URI,
            scope                 : SCOPES,
            state,
            code_challenge        : codeChallenge,
            code_challenge_method : 'S256'
        });

        return `${OAUTH.AUTHORIZE}?${params.toString()}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 3 — HANDLE OAUTH CALLBACK
    //
    //  Called from our /api/higgsfield-oauth/callback route after Higgsfield
    //  redirects the user back with ?code=... &state=...
    // ─────────────────────────────────────────────────────────────────────────
    async handleCallback({ code, state }) {
        if (typeof state !== 'string' || !/^[a-f0-9]{32}$/.test(state)) throw new Error('Invalid OAuth state. Start authorization again.');
        const pendingState = this._readJson(PENDING_FILE);
        const pending = pendingState?.attempts?.[state];
        if (!pending)                throw new Error('No pending OAuth flow — start over from /connect');
        if (process.env.NODE_ENV === 'production' && pending.ownerId !== process.env.HIGGSFIELD_OWNER_USER_ID) throw new Error('Connection owner changed. Start authorization again.');
        if (!pending.savedAt || Date.now() - pending.savedAt > 10 * 60 * 1000) throw new Error('OAuth request expired. Start again.');
        if (!code)                   throw new Error('No authorization code received from Higgsfield');
        delete pendingState.attempts[state];
        this._writeJson(PENDING_FILE, pendingState); // Consume before exchange; never replay.
        const epoch = this.connectionEpoch;

        const client = await this.ensureClientRegistered();

        console.log('🔄 [HiggsfieldOAuth] Exchanging code for tokens...');
        const tokenRes = await axios.post(OAUTH.TOKEN,
            new URLSearchParams({
                grant_type    : 'authorization_code',
                code,
                redirect_uri  : REDIRECT_URI,
                client_id     : client.client_id,
                ...(client.client_secret && { client_secret: client.client_secret }),
                code_verifier : pending.codeVerifier
            }).toString(),
            {
                headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout : 15000
            }
        );

        const tokens = tokenRes.data;
        if (epoch !== this.connectionEpoch) throw new Error('Connection cancelled. Start authorization again.');
        if (!tokens.access_token) {
            throw new Error('Token exchange returned no access token.');
        }

        // Compute absolute expiry
        const expiresAt = Date.now() + (Number(tokens.expires_in || 3600) * 1000);
        this.connectionEpoch++;
        const stored = {
            access_token  : tokens.access_token,
            refresh_token : tokens.refresh_token || null,
            expires_at    : expiresAt,
            scope         : tokens.scope || SCOPES,
            obtained_at   : Date.now()
        };

        this._writeJson(TOKEN_FILE, stored);

        console.log(`✅ [HiggsfieldOAuth] Tokens stored (expires in ${tokens.expires_in}s)`);
        return { connected: true, expires_in: tokens.expires_in };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STEP 4 — GET A VALID ACCESS TOKEN (refresh if expired)
    //
    //  All MCP calls go through getAccessToken() — auto-refreshes when needed.
    // ─────────────────────────────────────────────────────────────────────────
    async getAccessToken() {
        const stored = this._readJson(TOKEN_FILE);
        if (!stored?.access_token) {
            const err = new Error('Higgsfield is not connected. Visit /api/higgsfield-oauth/start to authorize.');
            err.code = 'NOT_CONNECTED';
            throw err;
        }

        // Refresh if expiring within next 60 seconds
        if (stored.expires_at && Date.now() > stored.expires_at - 60_000) {
            console.log('🔄 [HiggsfieldOAuth] Token near expiry — refreshing...');
            if (!this.refreshing) this.refreshing = this._refreshToken(stored).finally(() => { this.refreshing = null; });
            return await this.refreshing;
        }

        return stored.access_token;
    }

    async _refreshToken(stored) {
        const epoch = this.connectionEpoch;
        if (!stored.refresh_token) {
            throw new Error('Access token expired and no refresh_token available — reconnect required');
        }
        const client = await this.ensureClientRegistered();

        const res = await axios.post(OAUTH.TOKEN,
            new URLSearchParams({
                grant_type    : 'refresh_token',
                refresh_token : stored.refresh_token,
                client_id     : client.client_id,
                ...(client.client_secret && { client_secret: client.client_secret })
            }).toString(),
            {
                headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout : 15000
            }
        );

        const fresh = res.data;
        if (epoch !== this.connectionEpoch) throw new Error('Connection changed during refresh. Try again.');
        if (!fresh.access_token) throw new Error('Refresh returned no access token. Reconnect Higgsfield.');

        const updated = {
            access_token  : fresh.access_token,
            refresh_token : fresh.refresh_token || stored.refresh_token,
            expires_at    : Date.now() + (Number(fresh.expires_in || 3600) * 1000),
            scope         : fresh.scope || stored.scope,
            obtained_at   : Date.now()
        };
        this._writeJson(TOKEN_FILE, updated);
        console.log(`✓ [HiggsfieldOAuth] Token refreshed (expires in ${fresh.expires_in}s)`);
        return updated.access_token;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  STATUS
    // ─────────────────────────────────────────────────────────────────────────
    getConnectionStatus() {
        const tokens = this._readJson(TOKEN_FILE);
        const client = this._readJson(CLIENT_FILE);
        return {
            connected     : !!tokens?.access_token,
            client_registered : !!client?.client_id,
            redirect_uri  : REDIRECT_URI,
            expires_at    : tokens?.expires_at || null,
            obtained_at   : tokens?.obtained_at || null,
            scope         : tokens?.scope || null
        };
    }

    disconnect() {
        this.connectionEpoch++;
        this._deleteFile(TOKEN_FILE);
        this._deleteFile(PENDING_FILE);
        console.log('🔌 [HiggsfieldOAuth] Disconnected — token files removed');
    }
}

module.exports = new HiggsfieldOAuthService();

module.exports.HiggsfieldOAuthService = HiggsfieldOAuthService;
