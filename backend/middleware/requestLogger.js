/**
 * Request Logger Middleware
 * Logs all incoming requests — except high-frequency background polling
 * (sync/history/status) which would otherwise flood the console every few seconds.
 */
const QUIET_PATHS = [
    '/sync-higgsfield',
    '/api/videos?type=generated',
    '/api/images',
    '/api/higgsfield-oauth/status',
    '/api/videos/provider/balance',
];

const requestLogger = (req, res, next) => {
    const url = req.url;
    const isQuiet = QUIET_PATHS.some(p => url.startsWith(p) || url.includes(p));
    if (!isQuiet) {
        const timestamp = new Date().toISOString();
        const ip = req.ip || req.connection.remoteAddress;
        console.log(`[${timestamp}] ${req.method} ${url} - IP: ${ip}`);
    }
    next();
};

module.exports = requestLogger;
