/**
 * sessionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * In-memory session state tracker for the Bridal AI Wall pipeline.
 *
 * Each pipeline run creates a session with:
 *   - id          : unique UUID
 *   - status      : 'pending' | 'vton' | 'image_gen' | 'video_gen' |
 *                   'extending' | 'sound' | 'completed' | 'error'
 *   - progress    : 0–100
 *   - result      : final output URLs
 *   - error       : error message if failed
 *   - createdAt   : timestamp
 *   - updatedAt   : timestamp
 *
 * The frontend can poll GET /api/videos/session/:sessionId to check status.
 * WebSocket push is the primary notification mechanism (connectionManager).
 *
 * NOTE: Sessions are in-memory — lost on server restart.
 *       For production, replace with a Supabase row or Redis entry.
 * ─────────────────────────────────────────────────────────────────────────────
 */

class SessionService {
    constructor() {
        this.sessions = new Map();

        // Auto-clean sessions older than 2 hours to prevent memory leak
        setInterval(() => this._cleanup(), 30 * 60 * 1000); // every 30 min
    }

    /**
     * Create a new session.
     * @param {string} sessionId
     * @param {object} meta  – additional metadata to attach (options, weddingType, etc.)
     */
    create(sessionId, meta = {}) {
        const session = {
            id          : sessionId,
            status      : 'pending',
            progress    : 0,
            message     : 'Pipeline started...',
            result      : null,
            error       : null,
            ...meta,
            createdAt   : new Date().toISOString(),
            updatedAt   : new Date().toISOString()
        };
        this.sessions.set(sessionId, session);
        console.log(`[Session] Created: ${sessionId}`);
        return session;
    }

    /**
     * Update session fields.
     * @param {string} sessionId
     * @param {object} updates  – partial update (status, progress, message, result, error)
     */
    update(sessionId, updates = {}) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`[Session] Update called on unknown session: ${sessionId}`);
            return null;
        }
        const updated = {
            ...session,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.sessions.set(sessionId, updated);
        return updated;
    }

    /**
     * Get session by ID.
     */
    get(sessionId) {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get all sessions (for admin).
     */
    getAll() {
        return Array.from(this.sessions.values());
    }

    /**
     * Mark a session as completed with the final result.
     */
    complete(sessionId, result) {
        return this.update(sessionId, {
            status   : 'completed',
            progress : 100,
            message  : '✨ Cinematic Bridal Video Ready!',
            result
        });
    }

    /**
     * Mark a session as errored.
     */
    fail(sessionId, errorMessage) {
        return this.update(sessionId, {
            status   : 'error',
            progress : 0,
            message  : `Error: ${errorMessage}`,
            error    : errorMessage
        });
    }

    /**
     * Remove sessions older than 2 hours.
     */
    _cleanup() {
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        const now = Date.now();
        let cleaned = 0;
        for (const [id, session] of this.sessions.entries()) {
            if (now - new Date(session.createdAt).getTime() > TWO_HOURS) {
                this.sessions.delete(id);
                cleaned++;
            }
        }
        if (cleaned > 0) console.log(`[Session] Cleaned up ${cleaned} expired session(s)`);
    }
}

module.exports = new SessionService();
