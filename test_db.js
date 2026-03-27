const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI;
console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@'));

const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        console.log("✅ Successfully connected to MongoDB!");
        const databases = await client.db().admin().listDatabases();
        console.log("Databases:");
        databases.databases.forEach(db => console.log(` - ${db.name}`));
    } catch (err) {
        console.error("❌ Connection failed!");
        console.error("Error Name:", err.name);
        console.error("Error Message:", err.message);
        if (err.message.includes('Authentication failed')) {
            console.log("\n💡 TIP: The username or password in your MONGODB_URI is incorrect.");
            console.log("Check Atlas > Database Access for the correct credentials.");
        }
    } finally {
        await client.close();
    }
}
run();
