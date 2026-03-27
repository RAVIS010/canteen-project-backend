const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/CMS_Database';

async function test() {
    try {
        console.log('Testing connection to LOCAL MongoDB...');
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        console.log('✅ SUCCESS! Connected to LOCAL MongoDB.');
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        process.exit(1);
    }
}
test();
