const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Storage routes
router.post('/upload', upload.single('file'), storageController.uploadFile.bind(storageController));
router.post('/upload/image', upload.single('image'), storageController.uploadImage.bind(storageController));
router.get('/url/:bucket/:path', storageController.getPublicUrl.bind(storageController));
router.get('/list/:bucket', storageController.listFiles.bind(storageController));
router.delete('/:bucket/:path', storageController.deleteFile.bind(storageController));
router.post('/signed-url', storageController.createSignedUrl.bind(storageController));

module.exports = router;
