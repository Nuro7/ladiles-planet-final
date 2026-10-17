const userRepository = require('../repositories/userRepository');

/**
 * User Service - Business logic for user operations
 * Following Service Pattern for business logic abstraction
 */
class UserService {
    /**
     * Get all users
     * @returns {Promise<Array>} List of users
     */
    async getAllUsers() {
        try {
            return await userRepository.findAll();
        } catch (error) {
            throw new Error(`Failed to fetch users: ${error.message}`);
        }
    }

    /**
     * Get user by ID
     * @param {string} id - User ID
     * @returns {Promise<Object>} User object
     */
    async getUserById(id) {
        try {
            const user = await userRepository.findById(id);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(`Failed to fetch user: ${error.message}`);
        }
    }

    /**
     * Create new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Created user
     */
    async createUser(userData) {
        try {
            // Validate user data
            this.validateUserData(userData);

            // Check if email already exists
            const existingUser = await userRepository.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email already exists');
            }

            // Create user
            return await userRepository.create(userData);
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    /**
     * Update user
     * @param {string} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Promise<Object>} Updated user
     */
    async updateUser(id, userData) {
        try {
            // Check if user exists
            await this.getUserById(id);

            // Update user
            return await userRepository.update(id, userData);
        } catch (error) {
            throw new Error(`Failed to update user: ${error.message}`);
        }
    }

    /**
     * Delete user
     * @param {string} id - User ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteUser(id) {
        try {
            // Check if user exists
            await this.getUserById(id);

            // Delete user
            return await userRepository.delete(id);
        } catch (error) {
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }

    /**
     * Search users
     * @param {string} query - Search query
     * @returns {Promise<Array>} Matching users
     */
    async searchUsers(query) {
        try {
            if (!query || query.trim().length === 0) {
                throw new Error('Search query is required');
            }
            return await userRepository.search(query);
        } catch (error) {
            throw new Error(`Failed to search users: ${error.message}`);
        }
    }

    /**
     * Validate user data
     * @param {Object} userData - User data to validate
     * @throws {Error} If validation fails
     */
    validateUserData(userData) {
        if (!userData.email) {
            throw new Error('Email is required');
        }
        if (!userData.name) {
            throw new Error('Name is required');
        }
       
    }
}

module.exports = new UserService();
