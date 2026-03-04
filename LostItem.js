const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        maxlength: [200, 'Item name cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Electronics', 'Clothing', 'Books', 'Accessories', 'Documents', 'Bags', 'Keys', 'Wallet', 'Jewelry', 'Sports', 'Other']
    },
    locationLost: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    dateLost: {
        type: Date,
        required: [true, 'Date lost is required']
    },
    image: {
        type: String,
        default: null
    },
    reporter: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String }
    },
    reporterUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'claimed', 'rejected'],
        default: 'pending'
    },
    adminNote: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('LostItem', lostItemSchema);
