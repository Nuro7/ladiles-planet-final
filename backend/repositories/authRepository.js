const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Auth Repository - Handles direct interactions with Supabase Auth and User data
 */
class AuthRepository {
    /**
     * Get user details from the database (complementing Supabase Auth)
     * @param {string} userId - The Supabase Auth user ID
     */
    async findUserById(userId) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows found'
            throw error;
        }
        return data;
    }

    /**
     * Find user by email in database
     * @param {string} email 
     */
    async findUserByEmail(email) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return data;
    }

    /**
     * Create or update user in database
     * @param {Object} userData - User data (id, name, email)
     */
    async syncUser(userData) {
        const { data, error } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userData.id,
                name: userData.name,
                email: userData.email,
                updated_at: new Date()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Verify a session token and get user (Backend verification)
     * @param {string} token - The access token
     */
    async getUserFromToken(token) {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error) throw error;
        return user;
    }

    /**
     * Authenticate with Supabase
     * @param {string} email 
     * @param {string} password 
     */
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    }

    /**
     * Sign up with Supabase
     * @param {string} email 
     * @param {string} password 
     * @param {string} name 
     */
    /**
     * Sign up with Supabase (Admin version to auto-confirm email)
     * @param {string} email 
     * @param {string} password 
     * @param {string} name 
     */
    async signUp(email, password, name) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for staff
            user_metadata: { name }
        });
        if (error) throw error;
        return data;
    }

    /**
     * Manually confirm a user's email
     * @param {string} userId 
     */
    async confirmUserEmail(userId) {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email_confirm: true
        });
        if (error) throw error;
        return data;
    }
}

module.exports = new AuthRepository();
