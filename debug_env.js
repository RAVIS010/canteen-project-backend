const fs = require('fs');
require('dotenv').config();
const uri = process.env.MONGODB_URI;
console.log(`dotenv loaded URI length: ${uri.length}`);
console.log(`Value: [${uri}]`);
if (uri.startsWith('"')) {
    console.log("❌ ERROR: dotenv did NOT strip the double quotes!");
} else {
    console.log("✅ dotenv stripped the quotes (or they weren't there).");
}

