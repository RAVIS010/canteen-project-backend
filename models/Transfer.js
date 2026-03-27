const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    item: { type: String, required: true },
    quantity: { type: Number, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    price: { type: Number, default: 0 },
    total: { type: Number },
    reason: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transfer', transferSchema);
