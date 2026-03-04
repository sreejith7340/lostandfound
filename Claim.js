const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    itemType: {
        type: String,
        enum: ['found', 'lost'],
        required: true
    },
    itemName: {
        type: String,
        required: true
    },
    claimant: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String }
    },
    claimantUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    description: {
        type: String,
        required: [true, 'Claim description is required'],
        trim: true
    },
    proof: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    adminNote: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Claim', claimSchema);
