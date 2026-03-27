const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // Check if Admin exists
        const adminExists = await User.findOne({ email: 'admin@cms.com' });
        if (!adminExists) {
            await User.create({
                name: 'System Administrator',
                email: 'admin@cms.com',
                password: 'admin123',
                role: 'admin'
            });
            console.log('Admin user created: admin@cms.com / admin123');
        }

        // Check if Mess user exists
        const messExists = await User.findOne({ email: 'mess@cms.com' });
        if (!messExists) {
            await User.create({
                name: 'Mess Manager',
                email: 'mess@cms.com',
                password: 'mess123',
                role: 'mess'
            });
            console.log('Mess user created: mess@cms.com / mess123');
        }

        // Check if standard user (canteen) exists
        const userExists = await User.findOne({ email: 'user@cms.com' });
        if (!userExists) {
            await User.create({
                name: 'Canteen Operator',
                email: 'user@cms.com',
                password: 'user123',
                role: 'user'
            });
            console.log('User created: user@cms.com / user123');
        }

        console.log('Seeding completed successfully!');
        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedUsers();
