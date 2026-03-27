const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function verifyData() {
    try {
        console.log('--- MongoDB Atlas Data Verification ---');
        console.log(`Connection URI: ${process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`);

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas\n');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            console.log('⚠️ No collections found in the database.');
        } else {
            console.log(`Found ${collections.length} collections:`);
            console.log('-----------------------------------------');
            for (const col of collections) {
                const count = await db.collection(col.name).countDocuments();
                console.log(`- ${col.name.padEnd(15)} : ${count} documents`);
            }
            console.log('-----------------------------------------');
        }

        console.log('\nVerification complete. Use Atlas UI "Browse Collections" to see detailed records.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

verifyData();
