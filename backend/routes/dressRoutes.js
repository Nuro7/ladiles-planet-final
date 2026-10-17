const express = require('express');
const router = express.Router();
const multer = require('multer');
const dressController = require('../controllers/dressController');
const studioAccess = require('../middleware/studioAccess');

// Configure multer for dress image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, files: 8
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }

        // Allow specific image types
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid image type. Allowed: JPEG, PNG, WEBP, GIF'), false);
        }

        cb(null, true);
    }
});

// Dress routes
router.get('/stats', dressController.getDressStats.bind(dressController));
router.get('/recent', studioAccess, async (req,res,next)=>{try{res.json({success:true,data:await require('../services/dressFlowSyncService').recent()});}catch(error){next(error);}});
router.post('/recent/:key', studioAccess, async(req,res,next)=>{try{res.status(201).json({success:true,data:await require('../services/dressService').saveRecentDress(req.params.key,req.body)});}catch(error){next(error);}});
router.post('/sync/:key', studioAccess, async (req,res,next)=>{try{res.json({success:true,data:await require('../services/dressFlowSyncService').retry(req.params.key)});}catch(error){next(error);}});
router.post('/upload', studioAccess, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 8 }]), dressController.uploadDress.bind(dressController));
router.post('/:id/images', studioAccess, upload.array('images', 8), dressController.addImages.bind(dressController));
router.put('/:id/views', studioAccess, dressController.reorderImages.bind(dressController));
router.get('/', dressController.getAllDresses.bind(dressController));
router.get('/:id', dressController.getDressById.bind(dressController));
router.put('/:id', studioAccess, dressController.updateDress.bind(dressController));
router.put('/:id/image', studioAccess, upload.single('image'), dressController.updateDressImage.bind(dressController));
router.post('/:id/delete', studioAccess, dressController.softDeleteDress.bind(dressController));
router.post('/:id/restore', studioAccess, dressController.restoreDress.bind(dressController));
router.delete('/:id', studioAccess, dressController.deleteDress.bind(dressController)); // Permanent delete

module.exports = router;
