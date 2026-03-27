const mongoose = require('mongoose');
const uri = 'mongodb+srv://sudharsantest:Sudharsan429@cms2025.w9l1x.mongodb.net/CMS_2025?retryWrites=true&w=majority&appName=CMS2025';

async function test() {
    try {
        console.log('Testing connection to CMS_2025 cluster...');
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('✅ SUCCESS! Connected to CMS_2025 database.');
        process.exit(0);
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        process.exit(1);
    }
}
test();
