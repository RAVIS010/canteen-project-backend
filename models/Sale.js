const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    sold: { type: Number, required: true },
    price: { type: Number, required: true },
    paymentMode: { type: String, default: 'Cash' },
    cashAmount: { type: Number, default: 0 },
    gpayAmount: { type: Number, default: 0 },
    location: { type: String, default: 'canteen 1' },
    category: { type: String },
    operatorName: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sale', saleSchema);
