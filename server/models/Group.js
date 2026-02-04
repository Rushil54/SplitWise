const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        name: { type: String, required: true },
        email: { type: String }, // Optional, for linking to real users later
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If they are a registered user
        avatar: { type: String }, // hex color or url
        initialBalance: { type: Number, default: 0 }
    }],
    currency: {
        type: String,
        default: 'USD'
    }
}, { timestamps: true });

// Validation to ensure max 4 participants (Owner + 3 others)
GroupSchema.pre('save', function (next) {
    if (this.members.length > 4) {
        next(new Error('Groups can have a maximum of 4 participants (including the owner).'));
    } else {
        next();
    }
});

module.exports = mongoose.model('Group', GroupSchema);
