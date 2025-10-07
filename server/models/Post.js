const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user: {
        uid: { type: String, required: true },
        displayName: { type: String, required: true },
        // Contact info is required to complete a deal, stored here for easy access
        contact: {
            email: { type: String },
            phoneNumber: { type: String }
        }
    },
    cardName: {
        type: String,
        required: [true, 'Card name is required.'],
        trim: true
    },
    postType: {
        type: String,
        enum: ['sell', 'buy'],
        required: true
    },
    price: {
        type: Number,
        // Price is not required, as it can be fetched from an API
        min: 0
    },
    condition: {
        type: String,
        enum: ['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'],
        default: 'Near Mint'
    },
    cardImageUrl: {
        type: String,
        // A URL to the image of the card, uploaded by the client to a service like Firebase Storage
        default: 'https://placehold.co/243x353?text=No+Image'
    },
    // Background enrichment status
    enrichment: {
        type: Object,
        default: {
            priceStatus: 'idle', // idle | pending | done | error
            imageStatus: 'idle', // idle | pending | done | error
            lastError: null
        }
    },
    isApiPrice: {
        type: Boolean,
        default: false // Flag to indicate if the price was auto-generated
    },
    isActive: {
        type: Boolean,
        default: true // Posts can be marked inactive after a deal is made
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Post', PostSchema);
