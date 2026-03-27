const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
    fs.writeFileSync('uri_check.txt', '❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

try {
    const url = new URL(uri);
    let out = '✅ URI is a valid format\n';
    out += 'Protocol: ' + url.protocol + '\n';
    out += 'Username: ' + url.username + '\n';
    out += 'Password Hidden: ' + (url.password ? 'Yes' : 'No') + '\n';
    if (url.password && (url.password.startsWith('<') || url.password.endsWith('>'))) {
        out += '⚠️ WARNING: Your password appears to contain < or > brackets. Did you forget to remove them from the template?\n';
    }
    out += 'Host: ' + url.hostname + '\n';
    out += 'Pathname (DB Name): ' + url.pathname + '\n';
    fs.writeFileSync('uri_check.txt', out);
} catch (err) {
    fs.writeFileSync('uri_check.txt', '❌ URI is invalid: ' + err.message);
}
