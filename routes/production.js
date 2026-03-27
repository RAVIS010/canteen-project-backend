const express = require('express');
const Production = require('../models/Production');
const router = express.Router();

// Get all production records
router.get('/', async (req, res) => {
    try {
        const { location } = req.query;
        const query = location ? { location: location.toLowerCase() } : {};
        const records = await Production.find(query).sort({ createdAt: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Log a new production event or update an existing one
router.post('/', async (req, res) => {
    try {
        const { date, name, category, qty, price, total, productionUnit, location } = req.body;
        const targetLocation = (location || 'central mess').toLowerCase();

        // Check if an entry for the same product on the same day exists
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`^${escapedName}$`, 'i');

        let record = await Production.findOne({
            name: nameRegex,
            date: date,
            location: targetLocation
        });

        if (record) {
            // aggregate quantity to existing record
            record.qty += Number(qty);
            // Optionally update price if a new one is provided
            if (price) record.price = Number(price);
            record.total = record.qty * record.price;
            await record.save();
            return res.status(200).json(record);
        } else {
            // create new record
            record = new Production({
                date,
                name,
                category,
                qty,
                price,
                total: Number(qty) * Number(price),
                productionUnit,
                location: targetLocation
            });
            await record.save();
            return res.status(201).json(record);
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update a production record directly (e.g. deduct qty)
router.put('/:id', async (req, res) => {
    try {
        const { qty, total } = req.body;
        const record = await Production.findById(req.params.id);
        if (!record) return res.status(404).json({ error: 'Record not found' });

        record.qty = qty;
        record.total = total;
        await record.save();
        res.json(record);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a production record when quantity reaches 0
router.delete('/:id', async (req, res) => {
    try {
        await Production.findByIdAndDelete(req.params.id);
        res.json({ message: 'Record deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
