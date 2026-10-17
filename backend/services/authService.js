const authRepository = require('../repositories/authRepository');

/**
 * Auth Service - Business logic for authentication and authorization
 */
class AuthService {
    /**
     * Get the currently authenticated user's profile
     * @param {string} token - Access token from header
     */
    async getCurrentUserProfile(token) {
        try {
            // 1. Get user from Auth session
            const authUser = await authRepository.getUserFromToken(token);
            if (!authUser) {
                throw new Error('User not found in session');
            }

            // 2. Enrich with database metadata if available
            const userProfile = await authRepository.findUserById(authUser.id);

            return {
                id: authUser.id,
                email: authUser.email,
                role: userProfile?.role || 'staff', // Default role
                name: userProfile?.name || authUser.user_metadata?.name || 'Staff Member',
                lastLogin: authUser.last_sign_in_at,
                profile: userProfile
            };
        } catch (error) {
            console.error('Auth Service Error:', error);
            throw new Error(`Authentication logic failed: ${error.message}`);
        }
    }

    /**
     * Authenticate user with database check
     * @param {string} email 
     * @param {string} password 
     */
    async login(email, password) {
        try {
            // 1. Check if user exists in our collection
            const userInDb = await authRepository.findUserByEmail(email);

            // Note: In some scenarios, we might want to check Supabase first.
            // But for a staff-only app, checking our DB first is a good "gatekeeper".

            if (!userInDb) {
                throw new Error('Access denied: You are not registered in the boutique staff collection.');
            }

            if (!userInDb.is_active) {
                throw new Error('Access denied: Your account has been deactivated.');
            }

            // 2. Authenticate with Supabase Auth
            let authData;
            try {
                authData = await authRepository.signIn(email, password);
            } catch (signInError) {
                // If email is not confirmed but they are valid staff, auto-confirm it
                if (signInError.code === 'email_not_confirmed' || signInError.message.includes('email_not_confirmed')) {
                    console.log(`🔧 Auto-confirming email for staff: ${email}`);
                    await authRepository.confirmUserEmail(userInDb.id);
                    // Try signing in again
                    authData = await authRepository.signIn(email, password);
                } else {
                    throw signInError;
                }
            }

            return {
                session: authData.session,
                user: {
                    id: userInDb.id,
                    email: userInDb.email,
                    name: userInDb.name,
                    role: userInDb.role
                }
            };
        } catch (error) {
            console.error('Login Service Error:', error);
            throw new Error(error.message || 'Login failed');
        }
    }

    /**
     * Register a new staff member and sync to DB
     * @param {string} email 
     * @param {string} password 
     * @param {string} name 
     */
    async register(email, password, name) {
        try {
            // 1. Create in Supabase Auth
            const authData = await authRepository.signUp(email, password, name);

            if (!authData.user) {
                throw new Error('Failed to create authentication account');
            }

            // 2. Create in our Database
            const userProfile = await authRepository.syncUser({
                id: authData.user.id,
                email,
                name
            });

            return {
                user: authData.user,
                profile: userProfile
            };
        } catch (error) {
            console.error('Register Service Error:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    /**
     * Sync user data to database
     * @param {Object} userData - User data
     */
    async syncUserData(userData) {
        try {
            if (!userData.id || !userData.email) {
                throw new Error('User ID and Email are required for sync');
            }
            return await authRepository.syncUser(userData);
        } catch (error) {
            console.error('Auth Sync Error:', error);
            throw new Error(`Failed to sync user: ${error.message}`);
        }
    }
}

module.exports = new AuthService();
