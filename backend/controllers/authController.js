const authService = require('../services/authService');

/**
 * Auth Controller - Handles HTTP request/response for authentication
 */
class AuthController {
    /**
     * Authenticate user (Login)
     * @route POST /api/auth/login
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ success: false, error: 'Email and password are required' });
            }

            const data = await authService.login(email, password);
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Sign-in failed. Check your details or ask the owner to confirm account access.'
            });
        }
    }

    /**
     * Register new user
     * @route POST /api/auth/register
     */
    async register(req, res) {
        try {
            const { email, password, name } = req.body;
            if (!email || !password || !name) {
                return res.status(400).json({ success: false, error: 'Email, password and name are required' });
            }

            const data = await authService.register(email, password, name);
            res.status(201).json({
                success: true,
                data: data
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get current user information
     * @route GET /api/auth/me
     */
    async getMe(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized'
                });
            }

            const profile = await authService.getCurrentUserProfile(token);

            res.json({
                success: true,
                data: profile
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Logout placeholder
     * Since we use Supabase client-side, this is mainly for session invalidation if needed
     */
    async logout(req, res) {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }

    /**
     * Sync user data from Auth to DB
     * @route POST /api/auth/sync
     */
    async syncUser(req, res) {
        try {
            const userData = req.body;
            const profile = await authService.syncUserData(userData);
            res.status(201).json({
                success: true,
                data: profile
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new AuthController();
