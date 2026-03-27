const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, default: 0 },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: 'Nos' },
    location: { type: String, default: 'Central mess' }
});

productSchema.index({ name: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
