/**
 * Response Formatter Utility
 * Standardizes API responses
 */
class ResponseFormatter {
    /**
     * Success response
     * @param {Object} res - Express response object
     * @param {*} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code
     */
    static success(res, data, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Error response
     * @param {Object} res - Express response object
     * @param {string} error - Error message
     * @param {number} statusCode - HTTP status code
     */
    static error(res, error, statusCode = 500) {
        return res.status(statusCode).json({
            success: false,
            error,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Paginated response
     * @param {Object} res - Express response object
     * @param {Array} data - Response data
     * @param {number} page - Current page
     * @param {number} limit - Items per page
     * @param {number} total - Total items
     */
    static paginated(res, data, page, limit, total) {
        return res.status(200).json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = ResponseFormatter;
