const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
    reportLostItem, getLostItems, getLostItemById,
    reportFoundItem, getFoundItems, getFoundItemById,
    searchItems, submitClaim
} = require('../controllers/itemController');

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`)
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Search
router.get('/search', searchItems);

// Lost items
router.post('/lost', upload.single('image'), reportLostItem);
router.get('/lost', getLostItems);
router.get('/lost/:id', getLostItemById);

// Found items
router.post('/found', upload.single('image'), reportFoundItem);
router.get('/found', getFoundItems);
router.get('/found/:id', getFoundItemById);

// Claims
router.post('/claim', upload.single('proof'), submitClaim);

module.exports = router;
