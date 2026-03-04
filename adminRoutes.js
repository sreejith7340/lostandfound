const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getDashboardStats, getAllItems, updateItemStatus, deleteItem, editItem,
    getAllClaims, updateClaimStatus,
    getAllUsers, toggleBlockUser, deleteUser, getReporters
} = require('../controllers/adminController');

// All admin routes are protected
router.use(protect, adminOnly);

// Dashboard
router.get('/stats', getDashboardStats);

// Items management
router.get('/items', getAllItems);
router.put('/items/:type/:id/status', updateItemStatus);
router.put('/items/:type/:id', editItem);
router.delete('/items/:type/:id', deleteItem);

// Claims
router.get('/claims', getAllClaims);
router.put('/claims/:id/status', updateClaimStatus);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/block', toggleBlockUser);
router.delete('/users/:id', deleteUser);

// Reporters
router.get('/reporters', getReporters);

module.exports = router;
