const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const testLogin = async (email, password) => {
    try {
        console.log(`Testing login for ${email}...`);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const User = require('./models/User');
        const SessionLog = require('./models/SessionLog');

        let loginData = null;

        if (email === 'admin@cms.com' && password === 'admin123') {
            console.log('Using fallback admin logic');
            const token = jwt.sign({ id: 'fallback-admin', role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '12h' });
            loginData = {
                id: 'fallback-admin',
                token,
                role: 'admin',
                name: 'ADMIN',
                message: 'Login successful (Development Fallback)'
            };
        }

        if (!loginData) {
            console.log('Searching in DB...');
            const user = await User.findOne({ email });
            if (!user) {
                console.log('User not found');
                return;
            }
            const isMatch = await user.comparePassword(password);
            console.log('Password match:', isMatch);
            if (!isMatch) return;

            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
            loginData = {
                id: user._id.toString(),
                token,
                role: user.role,
                name: user.name || (user.email.split('@')[0]),
                canteenName: user.assignedCanteens?.join(' & ') || '',
                assignedCanteens: user.assignedCanteens || [],
                message: 'Login successful'
            };
        }

        console.log('Saving session log...');
        const now = new Date();
        const hour = now.getHours();
        let shift = 'Morning';
        if (hour >= 12 && hour < 20) shift = 'Afternoon';
        else if (hour >= 20 || hour < 4) shift = 'Evening';

        const newLog = new SessionLog({
            userId: loginData.id,
            name: loginData.name,
            role: loginData.role,
            loginTime: now,
            shift: shift,
            salesUnit: loginData.canteenName || 'N/A'
        });

        await newLog.save();
        console.log('Session log saved');
        console.log('Login successful!');

    } catch (error) {
        console.error('ERROR DURING LOGIN:', error);
    } finally {
        await mongoose.disconnect();
    }
};

testLogin('ravi@gmail.com', 'admin123'); // Assuming admin123 is the password set during seeding
