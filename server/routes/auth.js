const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ name, email, password: hashedPassword });
        const savedUser = await newUser.save();

        res.status(201).json({
            user: { id: savedUser._id, name: savedUser.name, email: savedUser.email },
            message: 'User registered successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Current User
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update current user profile
router.put('/me', verifyToken, async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        user.name = name || user.name;
        await user.save();

        // Optional: Cascade update to groups (for data consistency)
        // Find groups where this user is a member and update their embedded name
        // This is expensive but ensures consistency in the denormalized schema.
        try {
            const Group = require('../models/Group');
            await Group.updateMany(
                { 'members.userId': user._id },
                { $set: { 'members.$.name': user.name } }
            );
        } catch (cascadeErr) {
            console.error('Failed to cascade name update:', cascadeErr);
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: req.headers.authorization.split(' ')[1] // Return generic or same token
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
