const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');

// @desc    Admin Dashboard Stats
// @route   GET /api/admin/stats
const getDashboardStats = async (req, res) => {
    try {
        const totalLost = await LostItem.countDocuments();
        const totalFound = await FoundItem.countDocuments();
        const totalClaims = await Claim.countDocuments();
        const pendingClaims = await Claim.countDocuments({ status: 'pending' });
        const approvedClaims = await Claim.countDocuments({ status: 'approved' });
        const totalUsers = await User.countDocuments({ role: 'user' });

        // Lost items by status
        const lostPending = await LostItem.countDocuments({ status: 'pending' });
        const lostApproved = await LostItem.countDocuments({ status: 'approved' });
        const lostClaimed = await LostItem.countDocuments({ status: 'claimed' });
        const lostRejected = await LostItem.countDocuments({ status: 'rejected' });

        // Found items by status
        const foundPending = await FoundItem.countDocuments({ status: 'pending' });
        const foundApproved = await FoundItem.countDocuments({ status: 'approved' });
        const foundClaimed = await FoundItem.countDocuments({ status: 'claimed' });

        // Category breakdown
        const lostByCategory = await LostItem.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Recent activity (last 10 items combined)
        const recentLost = await LostItem.find().sort({ createdAt: -1 }).limit(5).select('itemName createdAt status');
        const recentFound = await FoundItem.find().sort({ createdAt: -1 }).limit(5).select('itemName createdAt status');

        res.status(200).json({
            success: true,
            stats: {
                totalItems: totalLost + totalFound,
                totalLost,
                totalFound,
                totalClaims,
                pendingClaims,
                approvedClaims,
                totalUsers,
                byStatus: {
                    lost: { pending: lostPending, approved: lostApproved, claimed: lostClaimed, rejected: lostRejected },
                    found: { pending: foundPending, approved: foundApproved, claimed: foundClaimed }
                },
                lostByCategory,
                recentLost,
                recentFound
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// MANAGE ITEMS
// ========================

// @desc    Get all items (admin)
// @route   GET /api/admin/items
const getAllItems = async (req, res) => {
    try {
        const { type = 'all', status, page = 1, limit = 20 } = req.query;
        let lost = [], found = [];

        const lostQuery = status ? { status } : {};
        const foundQuery = status ? { status } : {};

        if (type === 'all' || type === 'lost') {
            lost = await LostItem.find(lostQuery).sort({ createdAt: -1 });
        }
        if (type === 'all' || type === 'found') {
            found = await FoundItem.find(foundQuery).sort({ createdAt: -1 });
        }

        res.status(200).json({ success: true, lost, found });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update item status (approve/reject)
// @route   PUT /api/admin/items/:type/:id/status
const updateItemStatus = async (req, res) => {
    try {
        const { type, id } = req.params;
        const { status, adminNote } = req.body;

        const Model = type === 'lost' ? LostItem : FoundItem;
        const item = await Model.findByIdAndUpdate(id, { status, adminNote }, { new: true });

        if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });

        res.status(200).json({ success: true, message: `Item ${status} successfully.`, item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete an item
// @route   DELETE /api/admin/items/:type/:id
const deleteItem = async (req, res) => {
    try {
        const { type, id } = req.params;
        const Model = type === 'lost' ? LostItem : FoundItem;
        const item = await Model.findByIdAndDelete(id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
        res.status(200).json({ success: true, message: 'Item deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Edit an item
// @route   PUT /api/admin/items/:type/:id
const editItem = async (req, res) => {
    try {
        const { type, id } = req.params;
        const Model = type === 'lost' ? LostItem : FoundItem;
        const item = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
        res.status(200).json({ success: true, message: 'Item updated successfully.', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// CLAIM MANAGEMENT
// ========================

// @desc    Get all claims
// @route   GET /api/admin/claims
const getAllClaims = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        const claims = await Claim.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, claims });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update claim status
// @route   PUT /api/admin/claims/:id/status
const updateClaimStatus = async (req, res) => {
    try {
        const { status, adminNote } = req.body;
        const claim = await Claim.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true });
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found.' });

        // If approved, update the item status to claimed
        if (status === 'approved') {
            const Model = claim.itemType === 'lost' ? LostItem : FoundItem;
            await Model.findByIdAndUpdate(claim.itemId, { status: 'claimed' });
        }

        res.status(200).json({ success: true, message: `Claim ${status} successfully.`, claim });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// USER MANAGEMENT
// ========================

// @desc    Get all users
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Block/unblock user
// @route   PUT /api/admin/users/:id/block
const toggleBlockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        user.isBlocked = !user.isBlocked;
        await user.save();
        res.status(200).json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.status(200).json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get reporters (users who reported items)
// @route   GET /api/admin/reporters
const getReporters = async (req, res) => {
    try {
        const lostReporters = await LostItem.aggregate([
            { $group: { _id: '$reporter.email', name: { $first: '$reporter.name' }, email: { $first: '$reporter.email' }, phone: { $first: '$reporter.phone' }, count: { $sum: 1 } } }
        ]);
        const foundReporters = await FoundItem.aggregate([
            { $group: { _id: '$finder.email', name: { $first: '$finder.name' }, email: { $first: '$finder.email' }, phone: { $first: '$finder.phone' }, count: { $sum: 1 } } }
        ]);
        res.status(200).json({ success: true, lostReporters, foundReporters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getDashboardStats, getAllItems, updateItemStatus, deleteItem, editItem,
    getAllClaims, updateClaimStatus,
    getAllUsers, toggleBlockUser, deleteUser, getReporters
};
