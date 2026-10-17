const userService = require('../services/userService');

/**
 * User Controller - Handles HTTP requests for user operations
 */
class UserController {
    /**
     * Get all users
     * @route GET /api/users
     */
    async getAllUsers(req, res) {
        try {
            const users = await userService.getAllUsers();
            res.json({
                success: true,
                data: users,
                count: users.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get user by ID
     * @route GET /api/users/:id
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await userService.getUserById(id);
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Create new user
     * @route POST /api/users
     */
    async createUser(req, res) {
        try {
            const userData = req.body;
            const user = await userService.createUser(userData);
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Update user
     * @route PUT /api/users/:id
     */
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const userData = req.body;
            const user = await userService.updateUser(id, userData);
            res.json({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete user
     * @route DELETE /api/users/:id
     */
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            await userService.deleteUser(id);
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Search users
     * @route GET /api/users/search?q=query
     */
    async searchUsers(req, res) {
        try {
            const { q } = req.query;
            const users = await userService.searchUsers(q);
            res.json({
                success: true,
                data: users,
                count: users.length
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new UserController();
