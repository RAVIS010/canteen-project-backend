const express = require('express');
const Transfer = require('../models/Transfer');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// Get all transfers
// Get all transfers
router.get('/', async (req, res) => {
    try {
        const transfers = await Transfer.find().sort({ createdAt: -1 });
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Normalize a canteen/location name to a canonical lowercase form.
 * This resolves typos, hyphens, trailing spaces, and known aliases so that
 * "unit-3", "unit 3", "Unit 3" all map to the same identifier.
 */
function normalizeCanteen(name) {
    if (!name) return '';
    // 1) Trim, lowercase, replace hyphens with spaces, collapse whitespace
    let n = name.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

    // 2) Known alias mapping → canonical form (what the backend stores in Transfer.to)
    const aliasMap = {
        'four corner': 'fourth corner',
        'fourth corner': 'fourth corner',
        's block': 's block',
        'canteen 1': 's block',
        'unit 1': 's block',
        'unit 3': 'unit 3',
        'unit 3 fabeats': 'unit 3 fabeats',
        'unit 3fabeats': 'unit 3 fabeats',
        'unit 1 yummy tummy': 'yummy tummy',
        'yummy tummy': 'yummy tummy',
        'central mess': 'central mess',
        'bakery': 'bakery',
        'rvs canteen': 'rvs canteen',
    };
    return aliasMap[n] || n;
}

// Get pending transfers for a specific destination (supports comma-separated list of canteens)
// Uses name normalization to tolerate alias mismatches (e.g. "unit-3" ↔ "unit 3")
// Uses name normalization to tolerate alias mismatches (e.g. "unit-3" ↔ "unit 3")
router.get('/pending', verifyToken, async (req, res) => {
    try {
        const { to } = req.query;
        const query = { status: { $in: ['Pending', 'Returned'] } };

        if (to) {
            // Express may parse "?to=a,b" as an array ['a','b'] or as a string "a,b"
            // depending on how the client sends it. Handle both cases.
            let rawLocations = [];
            if (Array.isArray(to)) {
                // Multiple ?to[]=a&to[]=b params or comma parsed as array by Express
                rawLocations = to.flatMap(s => s.split(','));
            } else {
                // Single string, may be comma-separated
                rawLocations = to.split(',');
            }
            rawLocations = rawLocations.map(s => s.trim()).filter(Boolean);
            const normalizedLocations = [...new Set(rawLocations.map(normalizeCanteen))].filter(Boolean);

            console.log('[/pending] raw:', rawLocations, '→ normalized:', normalizedLocations);

            if (normalizedLocations.length === 1) {
                query.to = normalizedLocations[0];
            } else if (normalizedLocations.length > 1) {
                query.to = { $in: normalizedLocations };
            }
        }
        const transfers = await Transfer.find(query).sort({ createdAt: -1 });
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a transfer
// Create a transfer
// Create a transfer
router.post('/', verifyToken, async (req, res) => {
    try {
        const transferData = {
            ...req.body,
            status: req.body.status || 'Pending',
            to: normalizeCanteen(req.body.to || 's block'),
            from: normalizeCanteen(req.body.from || 'central mess'),
            item: req.body.item || req.body.itemName
        };

        const transfer = new Transfer(transferData);
        await transfer.save();

        // 1. DEDUCT from source stock immediately when transfer is initiated
        await deductFromSource(transfer.item, transfer.from, transfer.quantity);

        // 2. If status is 'Accepted', add to destination stock
        if (transfer.status === 'Accepted') {
            await updateStock(transfer.item, transfer.to, transfer.quantity, transfer.price);
        }

        res.status(201).json(transfer);
    } catch (error) {
        console.error('[Transfer API] POST error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Helper to update stock at a specific location
async function updateStock(itemName, location, quantity, price) {
    const Product = require('../models/Product');
    const normalizedLocation = location.toLowerCase();

    console.log(`[Stock Update] Updating: ${itemName} at ${normalizedLocation} (Qty: ${quantity}, Price: ${price})`);

    // Escape special characters for regex (names like "IC SHAKES (STRAWBERRY)")
    const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escapedName}$`, 'i');

    let product = await Product.findOne({ name: nameRegex, location: normalizedLocation });

    if (!product) {
        console.log(`[Stock Update] Product not found at ${normalizedLocation}, creating new entry.`);
        // Find a global/template product to copy category
        const template = await Product.findOne({ name: nameRegex });
        product = new Product({
            name: itemName,
            category: template ? template.category : 'General',
            price: (price !== undefined && price > 0) ? price : (template ? template.price : 0),
            stock: quantity,
            location: normalizedLocation
        });
    } else {
        console.log(`[Stock Update] Existing product found. Current stock: ${product.stock}`);
        product.stock += quantity;
        if (price !== undefined && price > 0) product.price = price;
    }
    await product.save();
    console.log(`[Stock Update] Completed. New stock: ${product.stock}`);
}

/**
 * Helper to deduct stock from the source location.
 * For 'central mess', it also finds and deducts from granular Production records.
 */
async function deductFromSource(itemName, fromLocation, quantity) {
    const Product = require('../models/Product');
    const Production = require('../models/Production');
    const normalizedFrom = fromLocation.toLowerCase();

    console.log(`[Stock Deduction] Deducting: ${quantity} ${itemName} from ${normalizedFrom}`);

    const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`^${escapedName}$`, 'i');

    // 1. Deduct from central catalog product if it exists
    const product = await Product.findOne({ name: nameRegex, location: normalizedFrom });
    if (product) {
        product.stock = Math.max(0, product.stock - quantity);
        await product.save();
        console.log(`[Stock Deduction] Product catalog updated. New stock: ${product.stock}`);
    }

    // 2. If the source is a production unit, deduct from granular 'Production' documents (FIFO)
    const productionUnits = [
        'central mess', 'bakery', 'yummy tummy', 's block', 'fourth corner', 
        'unit 3', 'unit 3 fabeats', 'saker backery', 'ezhil mess'
    ];
    if (productionUnits.includes(normalizedFrom)) {
        let remaining = quantity;
        // Find records of this item that still have qty > 0, oldest first, for this specific production unit
        const records = await Production.find({ name: nameRegex, location: normalizedFrom, qty: { $gt: 0 } }).sort({ createdAt: 1 });

        for (let record of records) {
            if (remaining <= 0) break;

            const deduct = Math.min(record.qty, remaining);
            record.qty -= deduct;
            record.total = record.qty * record.price;
            await record.save();

            remaining -= deduct;
            console.log(`[Stock Deduction] Deducted ${deduct} from Production record ${record._id}. Remaining to deduct: ${remaining}`);
        }
    }
}

// Update transfer status
// Update transfer status
router.put('/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body;
        console.log(`[Transfer API] Updating transfer ${req.params.id} to status: ${status}`);

        const transfer = await Transfer.findById(req.params.id);
        if (!transfer) {
            console.error(`[Transfer API] Transfer ${req.params.id} not found`);
            return res.status(404).json({ error: 'Transfer not found' });
        }

        console.log(`[Transfer API] Current transfer status: ${transfer.status}`);

        // Only update stock if moving to 'Accepted' status and not already accepted
        if (status === 'Accepted' && transfer.status !== 'Accepted') {
            await updateStock(transfer.item, transfer.to, transfer.quantity, transfer.price);
        }

        transfer.status = status;
        const updatedTransfer = await transfer.save();
        console.log(`[Transfer API] Transfer ${req.params.id} updated successfully`);
        res.json(updatedTransfer);
    } catch (error) {
        console.error(`[Transfer API] Error updating transfer:`, error);
        res.status(400).json({ error: error.message });
    }
});

// Accept a transfer and update product stock
// Accept a transfer and update product stock
router.patch('/:id/accept', verifyToken, async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id);
        if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

        transfer.status = 'Accepted';
        await transfer.save();

        await updateStock(transfer.item, transfer.to, transfer.quantity, transfer.price);

        res.json(transfer);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Clear all transfers, sales, and reset products to reflect ONLY production
// Delete individual transfer
// Delete individual transfer
router.delete('/history/clear', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        await Transfer.deleteMany({});
        res.json({ message: 'Transfer history cleared successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const transfer = await Transfer.findByIdAndDelete(req.params.id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }
        res.json({ message: 'Transfer deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/all', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const Sale = require('../models/Sale');
        const Product = require('../models/Product');
        const Production = require('../models/Production');

        // 1. Wipe out history
        await Transfer.deleteMany({});
        await Sale.deleteMany({});

        // 2. Wipe out current distributed stock
        await Product.deleteMany({});

        // 3. Rebuild Product catalog strictly from Production logs
        const productionLogs = await Production.find({});
        for (const log of productionLogs) {
            const loc = (log.productionUnit || log.location || 'central mess').toLowerCase();
            const escapedName = log.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const nameRegex = new RegExp(`^${escapedName}$`, 'i');

            let product = await Product.findOne({ name: nameRegex, location: loc });
            if (!product) {
                product = new Product({
                    name: log.name,
                    category: log.category || 'General',
                    price: log.price || 0,
                    stock: log.qty || 0,
                    location: loc
                });
                await product.save();
            } else {
                product.stock += (log.qty || 0);
                if (log.price) product.price = log.price;
                await product.save();
            }
        }

        res.json({ message: 'All history cleared and stock reset to production baseline.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
