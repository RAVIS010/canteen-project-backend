const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const SessionLog = require('../models/SessionLog');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// Get all sales (optionally filtered by location)
router.get('/', verifyToken, async (req, res) => {
    try {
        const { location } = req.query;
        const query = location ? { location: location.toLowerCase() } : {};
        const sales = await Sale.find(query).sort({ createdAt: -1 });
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/sales
 * @desc    Record a single sale and deduct stock from Product
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const { productName, sold, price, paymentMode, location, canteen, cashAmount, gpayAmount, category, operatorName } = req.body;
        // Use provided location/canteen, or fallback
        const normalizedLocation = (location || canteen || 'canteen 1').toLowerCase();

        // 1. Create sale record
        const sale = new Sale({
            productName,
            sold,
            price,
            paymentMode,
            cashAmount: cashAmount || 0,
            gpayAmount: gpayAmount || 0,
            location: normalizedLocation,
            category,
            operatorName
        });
        await sale.save();

        if (req.body.sessionId) {
            try {
                await SessionLog.findByIdAndUpdate(req.body.sessionId, { $inc: { billsCount: 1 } });
            } catch (err) {
                console.error('[Sales API] Failed to update session bills count:', err);
            }
        }

        // 2. Deduct stock from Product model
        // We use name + location to find the specific product entry
        const product = await Product.findOne({
            name: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
            location: normalizedLocation
        });

        if (product) {
            product.stock = Math.max(0, product.stock - sold);
            await product.save();
            console.log(`[Sales API] Stock updated for ${productName} at ${normalizedLocation}. Remaining: ${product.stock}`);
        } else {
            console.warn(`[Sales API] Product ${productName} not found at ${normalizedLocation} to deduct stock.`);
        }

        res.status(201).json(sale);
    } catch (error) {
        console.error('[Sales API] Error recording sale:', error);
        res.status(400).json({ error: error.message, details: error.stack });
    }
});

/**
 * @route   POST /api/sales/bulk
 * @desc    Record multiple sales and deduct stock for each product
 */
router.post('/bulk', verifyToken, async (req, res) => {
    try {
        const { items, paymentMode, location, canteen, cashAmount, gpayAmount } = req.body;
        const normalizedLocation = (location || canteen || 'canteen 1').toLowerCase();
        const saleRecords = [];

        const totalOrderAmount = items.reduce((sum, item) => sum + (item.price * (item.sold || item.qty || 1)), 0);

        console.log(`[Sales API] Processing bulk sale for ${items.length} items at ${normalizedLocation}`);

        for (const item of items) {
            // Per-item location fallback to common location
            const itemLocation = (item.location || normalizedLocation).toLowerCase();

            // Prep sale record
            const itemTotal = item.price * (item.sold || item.qty || 1);
            const ratio = totalOrderAmount > 0 ? (itemTotal / totalOrderAmount) : 0;

            saleRecords.push({
                productName: item.productName || item.name,
                sold: item.sold || item.qty,
                price: item.price,
                paymentMode: paymentMode,
                cashAmount: cashAmount ? (cashAmount * ratio) : 0,
                gpayAmount: gpayAmount ? (gpayAmount * ratio) : 0,
                location: itemLocation,
                category: item.category,
                operatorName: req.body.operatorName
            });

            // Deduct stock from Product
            const itemId = item.id || item._id;
            let product = null;

            if (itemId && itemId.match(/^[0-9a-fA-F]{24}$/)) {
                product = await Product.findById(itemId);
            }

            // Fallback to name match if ID fails or isn't provided
            if (!product) {
                const searchName = item.productName || item.name;
                product = await Product.findOne({
                    name: new RegExp(`^${searchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
                    location: itemLocation
                });
            }

            if (product) {
                // Ensure we use the correct sold quantity for deduction
                const quantityToDeduct = item.sold || item.qty || 1;
                product.stock = Math.max(0, product.stock - quantityToDeduct);
                await product.save();
                console.log(`[Sales API] Bulk update: ${item.productName || item.name} stock reduced by ${quantityToDeduct} at ${itemLocation}. Now: ${product.stock}`);
            } else {
                console.warn(`[Sales API] Bulk update: Product ${item.productName || item.name} not found at ${itemLocation} to deduct stock.`);
            }
        }

        // Insert all sale records at once
        await Sale.insertMany(saleRecords);

        if (req.body.sessionId) {
            try {
                // For bulk, it still represents a single "checkout/bill" from the user's perspective
                await SessionLog.findByIdAndUpdate(req.body.sessionId, { $inc: { billsCount: 1 } });
            } catch (err) {
                console.error('[Sales API] Failed to update session bulk bills count:', err);
            }
        }

        res.status(201).json({ message: 'Bulk sales processed and stock updated successfully' });
    } catch (error) {
        console.error('[Sales API] Error processing bulk sales:', error);
        res.status(400).json({ error: error.message, details: error.stack });
    }
});

// Delete all today's sales for a specific canteen location
router.delete('/canteen/:location', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        const location = decodeURIComponent(req.params.location).toLowerCase();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const result = await Sale.deleteMany({
            location,
            createdAt: { $gte: todayStart, $lte: todayEnd }
        });

        res.json({ message: `Deleted ${result.deletedCount} sale records for ${location}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete individual sale
router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {

    try {
        const sale = await Sale.findByIdAndDelete(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Sale record not found' });
        }
        res.json({ message: 'Sale record deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
