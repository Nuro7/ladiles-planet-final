const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const ownerAccess = require('../middleware/ownerAccess');

// Login (Public)
router.post('/login', (req, res) => authController.login(req, res));

// Register (Public)
router.post('/register', protect, ownerAccess, (req, res) => authController.register(req, res));

// Get current user details (Protected)
router.get('/me', protect, (req, res) => authController.getMe(req, res));

// Logout (Protected)
router.post('/logout', protect, (req, res) => {
    res.clearCookie('lp_media', { path: '/api/videos/studio', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    return authController.logout(req, res);
});

// Sync (Public or Auth middleware protected if you want, but normally called after frontend signup)
router.post('/sync', protect, ownerAccess, (req, res) => authController.syncUser(req, res));

module.exports = router;
