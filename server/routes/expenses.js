const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Expense = require('../models/Expense');
const Group = require('../models/Group');

// Get all expenses involves the user (for dashboard summary)
router.get('/my-expenses', verifyToken, async (req, res) => {
    try {
        const groups = await Group.find({ 'members.userId': req.user.id });
        const memberIds = [];
        groups.forEach(g => {
            const member = g.members.find(m => m.userId?.toString() === req.user.id);
            if (member) memberIds.push(member._id);
        });

        const expenses = await Expense.find({
            $or: [
                { payer: { $in: memberIds } },
                { 'splits.memberId': { $in: memberIds } }
            ]
        });

        const simplifiedExpenses = expenses.map(exp => {
            const group = groups.find(g => g._id.toString() === exp.groupId.toString());
            if (!group) return null;

            const myMember = group.members.find(m => m.userId?.toString() === req.user.id);
            if (!myMember) return null;

            const payerId = exp.payer.toString();
            const payerMember = group.members.find(m => m._id.toString() === payerId);
            const payerName = payerMember ? payerMember.name : 'Unknown';
            const isPayer = payerId === myMember._id.toString();

            // Transform splits to include member names
            const enrichedSplits = exp.splits.map(s => {
                const member = group.members.find(m => m._id.toString() === s.memberId.toString());
                return {
                    memberId: s.memberId,
                    name: member ? member.name : 'Unknown',
                    amount: s.amount
                };
            });

            return {
                _id: exp._id,
                description: exp.description || 'Expense',
                amount: exp.amount,
                payer: {
                    id: payerId,
                    name: payerName
                },
                isPayer,
                splits: enrichedSplits,
                myShare: isPayer ? 0 : enrichedSplits.find(s => s.memberId.toString() === myMember._id.toString())?.amount || 0,
                date: exp.date,
                groupId: exp.groupId,
                groupName: group.name,
                splitType: exp.splitType
            };
        }).filter(e => e !== null);

        res.json(simplifiedExpenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all expenses for a specific group
router.get('/group/:groupId', verifyToken, async (req, res) => {
    try {
        const expenses = await Expense.find({ groupId: req.params.groupId }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new expense
router.post('/', verifyToken, async (req, res) => {
    try {
        const { description, amount, date, groupId, payer, splitType, splits } = req.body;

        // Validate Group
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        // Verify user is part of the group
        const isMember = group.members.some(m => m.userId?.toString() === req.user.id) || group.createdBy.toString() === req.user.id;
        if (!isMember) return res.status(403).json({ message: 'Access denied' });

        // Create Expense
        const newExpense = new Expense({
            description,
            amount,
            date,
            groupId,
            payer, // This should be the memberId from the group.members array
            splitType,
            splits,
            createdBy: req.user.id
        });

        const savedExpense = await newExpense.save();
        res.status(201).json(savedExpense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Expense
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        // Check permission (Creator of expense or Group Admin)
        if (expense.createdBy.toString() !== req.user.id) {
            // Optional: Allow group admin to delete too. For now strict.
            return res.status(403).json({ message: 'Only the creator can delete this expense' });
        }

        await expense.deleteOne();
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Expense
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { description, amount, date, payer, splitType, splits } = req.body;
        const expense = await Expense.findById(req.params.id);

        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        // Check permission
        if (expense.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can edit this expense' });
        }

        expense.description = description || expense.description;
        expense.amount = amount || expense.amount;
        expense.date = date || expense.date;
        expense.payer = payer || expense.payer;
        expense.splitType = splitType || expense.splitType;
        expense.splits = splits || expense.splits;

        const updatedExpense = await expense.save();
        res.json(updatedExpense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
