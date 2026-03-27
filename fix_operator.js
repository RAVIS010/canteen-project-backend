require('dotenv').config();
const mongoose = require('mongoose');
const Sale = require('./models/Sale');

async function fixOperatorNames() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to DB');

        const result = await Sale.updateMany(
            { $or: [{ operatorName: { $exists: false } }, { operatorName: '' }, { operatorName: null }] },
            { $set: { operatorName: 'ADMIN' } }
        );

        console.log(`Updated ${result.modifiedCount} historical sales with missing operatorName.`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        mongoose.disconnect();
    }
}

fixOperatorNames();
