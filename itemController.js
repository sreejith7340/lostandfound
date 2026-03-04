const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const path = require('path');

// ========================
// LOST ITEMS
// ========================

// @desc    Report a lost item
// @route   POST /api/items/lost
const reportLostItem = async (req, res) => {
    try {
        const { itemName, description, category, locationLost, dateLost, reporterName, reporterEmail, reporterPhone } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const item = await LostItem.create({
            itemName,
            description,
            category,
            locationLost,
            dateLost,
            image,
            reporter: {
                name: reporterName,
                email: reporterEmail,
                phone: reporterPhone
            },
            reporterUser: req.user ? req.user._id : null
        });

        res.status(201).json({ success: true, message: 'Lost item reported successfully!', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all lost items (public, approved)
// @route   GET /api/items/lost
const getLostItems = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 12 } = req.query;
        let query = { status: 'approved' };

        if (search) {
            query.$or = [
                { itemName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { locationLost: { $regex: search, $options: 'i' } }
            ];
        }
        if (category && category !== 'all') query.category = category;

        const total = await LostItem.countDocuments(query);
        const items = await LostItem.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({ success: true, total, page: parseInt(page), items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single lost item by ID
// @route   GET /api/items/lost/:id
const getLostItemById = async (req, res) => {
    try {
        const item = await LostItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
        res.status(200).json({ success: true, item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// FOUND ITEMS
// ========================

// @desc    Report a found item
// @route   POST /api/items/found
const reportFoundItem = async (req, res) => {
    try {
        const { itemName, description, category, locationFound, dateFound, finderName, finderEmail, finderPhone } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const item = await FoundItem.create({
            itemName,
            description,
            category,
            locationFound,
            dateFound,
            image,
            finder: {
                name: finderName,
                email: finderEmail,
                phone: finderPhone
            },
            finderUser: req.user ? req.user._id : null
        });

        res.status(201).json({ success: true, message: 'Found item reported successfully!', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all found items (public, approved)
// @route   GET /api/items/found
const getFoundItems = async (req, res) => {
    try {
        const { search, category, page = 1, limit = 12 } = req.query;
        let query = { status: 'approved' };

        if (search) {
            query.$or = [
                { itemName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { locationFound: { $regex: search, $options: 'i' } }
            ];
        }
        if (category && category !== 'all') query.category = category;

        const total = await FoundItem.countDocuments(query);
        const items = await FoundItem.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({ success: true, total, page: parseInt(page), items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single found item by ID
// @route   GET /api/items/found/:id
const getFoundItemById = async (req, res) => {
    try {
        const item = await FoundItem.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found.' });
        res.status(200).json({ success: true, item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// SEARCH (both lost & found)
// ========================

// @desc    Search all items
// @route   GET /api/items/search
const searchItems = async (req, res) => {
    try {
        const { q, category, type } = req.query;

        let lostResults = [];
        let foundResults = [];

        const buildQuery = (fields) => {
            let query = { status: 'approved' };
            if (q) query.$or = fields.map(f => ({ [f]: { $regex: q, $options: 'i' } }));
            if (category && category !== 'all') query.category = category;
            return query;
        };

        if (!type || type === 'lost') {
            lostResults = await LostItem.find(buildQuery(['itemName', 'description', 'locationLost'])).sort({ createdAt: -1 }).limit(50);
        }
        if (!type || type === 'found') {
            foundResults = await FoundItem.find(buildQuery(['itemName', 'description', 'locationFound'])).sort({ createdAt: -1 }).limit(50);
        }

        res.status(200).json({ success: true, lost: lostResults, found: foundResults });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ========================
// CLAIMS
// ========================

// @desc    Submit a claim request
// @route   POST /api/items/claim
const submitClaim = async (req, res) => {
    try {
        const { itemId, itemType, itemName, claimantName, claimantEmail, claimantPhone, description } = req.body;
        const proof = req.file ? `/uploads/${req.file.filename}` : null;

        const claim = await Claim.create({
            itemId,
            itemType,
            itemName,
            claimant: {
                name: claimantName,
                email: claimantEmail,
                phone: claimantPhone
            },
            claimantUser: req.user ? req.user._id : null,
            description,
            proof
        });

        res.status(201).json({ success: true, message: 'Claim submitted successfully! Admin will review it.', claim });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    reportLostItem, getLostItems, getLostItemById,
    reportFoundItem, getFoundItems, getFoundItemById,
    searchItems, submitClaim
};
