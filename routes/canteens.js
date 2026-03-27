const express = require('express');
const router = express.Router();
const Canteen = require('../models/Canteen');
const { verifyToken } = require('../middleware/auth');

// Get all canteens
router.get('/', async (req, res) => {
    try {
        const canteens = await Canteen.find().sort({ name: 1 });
        res.json(canteens);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new canteen
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, type, status, location } = req.body;
        const canteen = new Canteen({ name, type, status, location });
        await canteen.save();
        res.status(201).json(canteen);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Canteen name already exists' });
        }
        res.status(400).json({ error: error.message });
    }
});

// Update a canteen
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const { name, status, type } = req.body;
        const canteen = await Canteen.findByIdAndUpdate(
            req.params.id,
            { name, status, type },
            { new: true, runValidators: true }
        );
        if (!canteen) return res.status(404).json({ error: 'Canteen not found' });
        res.json(canteen);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a canteen
router.delete('/:name', verifyToken, async (req, res) => {
    try {
        const canteen = await Canteen.findOneAndDelete({ name: req.params.name });
        if (!canteen) return res.status(404).json({ error: 'Canteen not found' });
        res.json({ message: 'Canteen deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
