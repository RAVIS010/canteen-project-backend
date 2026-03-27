const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
    date: { type: String, required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    productionUnit: { type: String, required: true },
    location: { type: String, default: 'central mess' }
}, { timestamps: true });

module.exports = mongoose.model('Production', productionSchema);
