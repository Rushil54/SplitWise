const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Group = require('../models/Group');
const User = require('../models/User');

// Get all groups for the logged-in user
router.get('/', verifyToken, async (req, res) => {
    try {
        const groups = await Group.find({
            $or: [
                { createdBy: req.user.id },
                { 'members.userId': req.user.id }
            ]
        }).sort({ createdAt: -1 });
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new group
router.post('/', verifyToken, async (req, res) => {
    try {
        console.log('Creating Group Payload:', JSON.stringify(req.body, null, 2));
        const { name, members } = req.body;

        // Add creator as the first member if not present (though UI should handle this)
        const user = await User.findById(req.user.id);

        const initialMembers = [{
            name: user.name,
            userId: user._id,
            email: user.email,
            avatar: 'bg-blue-500', // Default color for owner
            initialBalance: req.body.ownerInitialBalance || 0
        }];

        // Add other members from request
        if (members && Array.isArray(members)) {
            const sanitizedMembers = members.map(m => ({
                name: m.name,
                email: m.email,
                avatar: m.avatar,
                initialBalance: Number(m.initialBalance) || 0
            }));
            initialMembers.push(...sanitizedMembers);
        }

        if (initialMembers.length > 4) {
            return res.status(400).json({ message: 'Max 4 participants allowed' });
        }

        const newGroup = new Group({
            name,
            createdBy: req.user.id,
            members: initialMembers
        });

        const savedGroup = await newGroup.save();
        res.status(201).json(savedGroup);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single group details
router.get('/:id', verifyToken, async (req, res) => {
    try {
        console.log(`Fetching group: ${req.params.id} for user: ${req.user.id}`);
        const group = await Group.findById(req.params.id);
        if (!group) {
            console.log('Group not found in DB');
            return res.status(404).json({ message: 'Group not found' });
        }

        // Verify access
        const isMember = group.members.some(m => m.userId?.toString() === req.user.id) || group.createdBy.toString() === req.user.id;

        console.log(`Access check - Creator: ${group.createdBy}, User: ${req.user.id}, IsMember: ${isMember}`);

        if (!isMember) return res.status(403).json({ message: 'Access denied' });

        res.json(group);
    } catch (err) {
        console.error('Error fetching group:', err);
        res.status(500).json({ error: err.message });
    }
});

// Add Member to group
router.post('/:id/members', verifyToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        const group = await Group.findById(req.params.id);

        if (!group) return res.status(404).json({ message: 'Group not found' });
        if (group.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Only admin can add members' });

        if (group.members.length >= 4) {
            return res.status(400).json({ message: 'Group is full (Max 4 members)' });
        }

        group.members.push({ name, email });
        await group.save();

        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a group
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) return res.status(404).json({ message: 'Group not found' });

        if (group.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the creator can delete this group' });
        }

        // Ideally, we should also delete expenses related to this group
        const Expense = require('../models/Expense');
        await Expense.deleteMany({ groupId: group._id });

        await group.deleteOne();
        res.json({ message: 'Group deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
