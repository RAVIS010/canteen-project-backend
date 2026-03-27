const dotenv = require('dotenv');
dotenv.config();
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'PRESENT' : 'MISSING');
