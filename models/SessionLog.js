const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
    userId: { type: String }, // Can be real Mongo ID or "fallback-user"
    name: { type: String, required: true },
    role: { type: String },
    loginTime: { type: Date, default: Date.now },
    logoutTime: { type: Date },
    shift: { type: String },
    salesUnit: { type: String },
    billsCount: { type: Number, default: 0 }
});

module.exports = mongoose.model('SessionLog', sessionLogSchema);
