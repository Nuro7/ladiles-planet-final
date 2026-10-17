const { supabase, supabaseAdmin } = require('../config/database');

/**
 * User Repository - Handles all database operations for users
 * Following Repository Pattern for data access abstraction
 */
class UserRepository {
    /**
     * Get all users
     * @returns {Promise<Array>} List of users
     */
    async findAll() {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;
        return data;
    }

    /**
     * Get user by ID
     * @param {string} id - User ID
     * @returns {Promise<Object>} User object
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Get user by email
     * @param {string} email - User email
     * @returns {Promise<Object>} User object
     */
    async findByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Create new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    async create(userData) {
        const { data, error } = await supabase
            .from('users')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update user
     * @param {string} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Promise<Object>} Updated user
     */
    async update(id, userData) {
        const { data, error } = await supabase
            .from('users')
            .update(userData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete user
     * @param {string} id - User ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    /**
     * Search users by query
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching users
     */
    async search(query) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

        if (error) throw error;
        return data;
    }
}

module.exports = new UserRepository();
