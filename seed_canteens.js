const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Canteen = require('./models/Canteen');

dotenv.config();

const canteens = [
    { name: 'S Block', type: 'CANTEEN' },
    { name: 'Fourth Corner', type: 'CANTEEN' },
    { name: 'Unit 3', type: 'CANTEEN' },
    { name: 'Unit 3 Fabeats', type: 'CANTEEN' },
    { name: 'Unit-1 Yummy Tummy', type: 'CANTEEN' },
    { name: 'Central Mess', type: 'CANTEEN' },
    { name: 'Bakery', type: 'CANTEEN' }
];

const productionUnits = [
    { name: 'S BLOCK', type: 'PRODUCTION' },
    { name: 'CENTRAL MESS', type: 'PRODUCTION' },
    { name: 'BAKERY', type: 'PRODUCTION' }
];

const seedCanteens = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing canteens to avoid duplicates if re-running
        await Canteen.deleteMany({});
        
        await Canteen.insertMany([...canteens, ...productionUnits]);
        console.log('Successfully seeded canteens and production units');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding canteens:', error);
        process.exit(1);
    }
};

seedCanteens();
