const express = require('express');
const Product = require('../models/Product');
const { verifyToken, checkRole } = require('../middleware/auth');
const router = express.Router();

// Get all products (supports multiple locations - comma separated or single)
router.get('/', async (req, res) => {
    try {
        const rawLocation = req.query.location;
        let query = {};
        if (rawLocation) {
            const rawLocations = Array.isArray(rawLocation) ? rawLocation : rawLocation.split(',');
            const locations = rawLocations.map(l => l.trim().toLowerCase()).filter(Boolean);
            query = { location: { $in: locations } };
        }
        let products = await Product.find(query).sort({ category: 1, name: 1 });

        // Optimization: If any product has ₹0, try to find its master price from other records
        const productsWithZeroPrice = products.filter(p => !p.price || p.price <= 0);
        if (productsWithZeroPrice.length > 0) {
            // Get all products to find master prices
            const allProductTemplates = await Product.find({
                name: { $in: productsWithZeroPrice.map(p => p.name) },
                price: { $gt: 0 }
            });

            // Re-map products with the best available price
            products = products.map(p => {
                if (!p.price || p.price <= 0) {
                    const template = allProductTemplates.find(t =>
                        t.name.toLowerCase() === p.name.toLowerCase() && t.price > 0
                    );
                    if (template) {
                        return { ...p.toObject(), price: template.price, _isMasterPrice: true };
                    }
                }
                return p;
            });
        }

        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add or update product
router.post('/', verifyToken, async (req, res) => {
    try {
        const { name, category, price, stock, location } = req.body;
        const targetLocation = (location || 'Central mess').toLowerCase();
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameRegex = new RegExp(`^${escapedName}$`, 'i');
        let product = await Product.findOne({ name: nameRegex, location: targetLocation });

        if (product) {
            product.category = category;
            if (price !== undefined) {
                product.price = price;
                // Sync price globally for all locations
                await Product.updateMany({ name: nameRegex }, { price: price });
            }
            if (stock !== undefined) product.stock += stock;
            await product.save();
        } else {
            product = new Product({
                name,
                category,
                price: price || 0,
                stock: stock || 0,
                location: targetLocation
            });
            await product.save();
            // Sync price globally for all locations if this is a new product name that might exist elsewhere
            if (price !== undefined) {
                await Product.updateMany({ name: nameRegex }, { price: price });
            }
        }
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete product
router.delete('/:id', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
