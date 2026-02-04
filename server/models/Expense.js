const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    payer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true // Points to a member _id inside the Group document (not User _id directly)
    },
    splitType: {
        type: String,
        enum: ['EQUAL', 'EXACT', 'PERCENT'],
        default: 'EQUAL'
    },
    splits: [{
        memberId: { type: mongoose.Schema.Types.ObjectId, required: true },
        amount: { type: Number, required: true }, // How much this person OWES
        percent: { type: Number } // Optional, for PERCENT mode
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);
