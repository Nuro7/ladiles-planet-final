const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Authentication Middleware
 * Protects routes by validating the Supabase access token (JWT)
 */
const protect = async (req, res, next) => {
    // BYPASS AUTHENTICATION
    req.user = { id: 'mock-user-id', name: 'Mock Admin', role: 'admin' };
    return next();
    
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        // Verify token with Supabase Auth
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }

        // Check if user exists in our staff collection and is active
        const { data: staffData, error: staffError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (staffError || !staffData) {
            return res.status(401).json({
                success: false,
                error: 'Access denied: You are not registered in the staff collection'
            });
        }

        if (!staffData.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Access denied: Your account is inactive'
            });
        }

        // Add user and staff data to request object
        req.user = {
            ...user,
            ...staffData
        };
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

module.exports = { protect };
