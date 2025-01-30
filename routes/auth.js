const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, medicalProfile } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create new user
        user = new User({
            username,
            email,
            password,
            medicalProfile
        });

        await user.save();

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.json({ token });

    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
        res.json({ token });

    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching profile' });
    }
});

// Update medical profile
router.put('/profile/medical', auth, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        user.medicalProfile = { ...user.medicalProfile, ...req.body };
        await user.save();
        res.json(user.medicalProfile);
    } catch (error) {
        res.status(500).json({ error: 'Error updating medical profile' });
    }
});

module.exports = router; 