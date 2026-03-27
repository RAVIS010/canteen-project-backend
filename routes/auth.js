const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const SessionLog = require('../models/SessionLog');
const router = express.Router();

const FALLBACK_JWT_SECRET = 'fallback_secret';
const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_JWT_SECRET;
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ Warning: JWT_SECRET is not set. Using fallback secret (not safe for production).');
}

router.post('/register', async (req, res) => {
    try {
        const { email, password, role, name, contactNumber, sapId, assignedCanteens } = req.body;
        const user = new User({ email, password, role, name, contactNumber, sapId, assignedCanteens });
        await user.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let loginData = null;

        // --- FALLBACK LOGIN (For Development when DB is down) ---
        // This allows you to log in even if Atlas is giving SSL errors
        if (email === 'admin@cms.com' && password === 'admin123') {
            const token = jwt.sign({ id: 'fallback-admin', role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
            loginData = {
                id: 'fallback-admin',
                token,
                role: 'admin',
                name: 'ADMIN',
                message: 'Login successful (Development Fallback)'
            };
        }
        // -----------------------------------------------------

        if (!loginData) {
            if (mongoose.connection.readyState !== 1) {
                return res.status(503).json({
                    error: 'Service unavailable. Unable to authenticate because the database is offline.',
                    details: 'Please try again later or use the development fallback admin credentials (admin@cms.com/admin123)'
                });
            }

            const user = await User.findOne({ email });
            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
            loginData = {
                id: user._id.toString(),
                token,
                role: user.role,
                name: user.name || (user.email.split('@')[0]),
                canteenName: user.assignedCanteens?.join(' & ') || '',
                assignedCanteens: user.assignedCanteens || [],
                message: 'Login successful'
            };
        }

        // Create Session Log
        try {
            const now = new Date();
            const hour = now.getHours();
            let shift = 'Morning';
            if (hour >= 12 && hour < 20) shift = 'Afternoon';
            else if (hour >= 20 || hour < 4) shift = 'Evening';

            const newLog = new SessionLog({
                userId: loginData.id,
                name: loginData.name,
                role: loginData.role,
                loginTime: now,
                shift: shift,
                salesUnit: loginData.canteenName || 'N/A'
            });
            await newLog.save();
            loginData.sessionId = newLog._id;
        } catch (logErr) {
            console.error('Failed to save session log:', logErr);
            // Non-blocking error
        }

        return res.json(loginData);

    } catch (error) {
        console.error('Database error during login:', error);

        const isNetworkIssue = [
            'MongoNetworkError',
            'MongooseServerSelectionError'
        ].includes(error.name) ||
            /ECONNREFUSED|ETIMEDOUT|network/i.test(error.message);

        if (isNetworkIssue) {
            return res.status(503).json({
                error: 'Service unavailable due to database connectivity issues. Please try again later or use admin fallback credentials.',
                details: error.message
            });
        }

        res.status(500).json({
            error: 'Internal server error while logging in.',
            details: error.message
        });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, role, assignedCanteens } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, role, assignedCanteens },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout (Mark Session Log)
router.post('/logout', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (sessionId) {
            await SessionLog.findByIdAndUpdate(sessionId, { logoutTime: new Date() });
        }
        res.json({ message: 'Logged out properly.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all session logs
router.get('/session-logs', async (req, res) => {
    try {
        const logs = await SessionLog.find().sort({ loginTime: -1 }).limit(200);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear all session logs
router.delete('/session-logs/all', async (req, res) => {
    try {
        await SessionLog.deleteMany({});
        res.json({ message: 'All session logs cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete individual session log
router.delete('/session-logs/:id', async (req, res) => {
    try {
        const log = await SessionLog.findByIdAndDelete(req.params.id);
        if (!log) {
            return res.status(404).json({ error: 'Session log not found' });
        }
        res.json({ message: 'Session log deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
