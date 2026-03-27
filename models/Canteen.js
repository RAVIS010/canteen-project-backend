const mongoose = require('mongoose');

const canteenSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    location: { type: String },
    type: { type: String, enum: ['CANTEEN', 'PRODUCTION'], default: 'CANTEEN' },
    status: { type: String, default: 'ACTIVE' }
}, { timestamps: true });

module.exports = mongoose.model('Canteen', canteenSchema);
