const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    console.log('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

try {
    const url = new URL(uri);
    console.log('✅ URI is a valid format');
    console.log('Protocol:', url.protocol);
    console.log('Username:', url.username);
    console.log('Password length:', url.password ? url.password.length : 0);
    console.log('Host:', url.hostname);
    console.log('Pathname (DB Name):', url.pathname);

    if (url.password && (url.password.includes('@') || url.password.includes(':') || url.password.includes('/'))) {
        console.log('⚠️ WARNING: Your password contains special characters (@, :, /). These MUST be URL encoded.');
        console.log('Example: @ -> %40');
    }
} catch (err) {
    console.log('❌ URI is invalid:', err.message);
    console.log('Hiding part of URI for security:', uri.substring(0, 10) + '...');
}
