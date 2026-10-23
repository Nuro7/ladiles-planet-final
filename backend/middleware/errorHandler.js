/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */
const errorHandler = (err, req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        console.error('[API error]', err.code || err.name || 'Error');
        const status = err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.status >= 400 && err.status < 500 ? err.status : 500);
        return res.status(status).json({ success: false, error: status === 413 ? 'Request is too large.' : status === 500 ? 'Request failed. Please contact the owner.' : 'Invalid request.' });
    }
    console.error('Error:', err);

    // Supabase errors
    if (err.code) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: err.code
        });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.message
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
};

module.exports = errorHandler;
