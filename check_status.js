const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const Production = require('./models/Production');

dotenv.config();

const checkStock = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        const productsWithStock = await Product.find({ stock: { $gt: 0 } });
        const productionWithQty = await Production.find({ qty: { $gt: 0 } });

        console.log('\n--- STOCK CHECK RESULTS ---');
        console.log(`Products with stock > 0: ${productsWithStock.length}`);
        if (productsWithStock.length > 0) {
            productsWithStock.forEach(p => console.log(`- ${p.name} at ${p.location}: ${p.stock}`));
        } else {
            console.log('✅ All product stocks are 0.');
        }

        console.log(`\nProduction records with qty > 0: ${productionWithQty.length}`);
        if (productionWithQty.length > 0) {
            productionWithQty.forEach(p => console.log(`- ${p.name} at ${p.location}: ${p.qty}`));
        } else {
            console.log('✅ All production quantities are 0.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Error checking stock:', err);
        process.exit(1);
    }
};

checkStock();
