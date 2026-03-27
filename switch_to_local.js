const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const localUri = 'mongodb://localhost:27017/CMS_Database';

if (fs.existsSync(envPath)) {
    let content = fs.readFileSync(envPath, 'utf8');

    // Check if MONGODB_URI already exists
    if (content.includes('MONGODB_URI=')) {
        // Comment out existing MONGODB_URI and add local one, or just replace it
        // To be safe and allow easy switching back, let's comment the old one and add the new one
        content = content.replace(/^(MONGODB_URI=.*)$/m, '# $1\nMONGODB_URI=' + localUri);
    } else {
        content += '\nMONGODB_URI=' + localUri;
    }

    fs.writeFileSync(envPath, content);
    console.log('✅ Updated .env to use LOCAL database.');
} else {
    fs.writeFileSync(envPath, 'MONGODB_URI=' + localUri + '\nPORT=5000');
    console.log('✅ Created .env with LOCAL database URI.');
}
