const express = require('express');
const router = express.Router();
const multer = require('multer');
const brideController = require('../controllers/brideController');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    },
});

/**
 * Bride Routes
 */

// Search brides (must be before /:id routes)
router.get('/search', brideController.searchBrides.bind(brideController));

// Get bride by name (must be before /:id routes)
router.get('/name/:name', brideController.getBrideByName.bind(brideController));

// Create bride with images (all-in-one upload, 1+ images, any angles)
router.post(
    '/upload',
    upload.array('images', 10),
    brideController.createBrideWithImages.bind(brideController)
);

// CRUD operations
router.post('/', brideController.createBride.bind(brideController));
router.get('/', brideController.getAllBrides.bind(brideController));
router.get('/:id', brideController.getBrideById.bind(brideController));
router.get('/:id/with-images', brideController.getBrideWithImages.bind(brideController));
router.put('/:id', brideController.updateBride.bind(brideController));
router.put('/:id/status', brideController.updateBrideStatus.bind(brideController));
router.delete('/:id', brideController.deleteBride.bind(brideController));

// Image operations
router.post(
    '/:id/images',
    upload.array('images', 4), // Accept up to 4 images
    brideController.uploadBrideImages.bind(brideController)
);
router.get('/:id/images', brideController.getBrideImages.bind(brideController));
router.get(
    '/:id/images/:imageType/:angle',
    brideController.getBrideImageByTypeAndAngle.bind(brideController)
);
router.delete('/:id/images/:imageId', brideController.deleteBrideImage.bind(brideController));

module.exports = router;
