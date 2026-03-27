const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const transferRoutes = require('./routes/transfers');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const reportsRoutes = require('./routes/reports');
const categoryRoutes = require('./routes/categories');
const { initCronJobs } = require('./utils/cronJobs');

dotenv.config();



const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/transfers', transferRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/production', require('./routes/production'));
app.use('/api/canteens', require('./routes/canteens'));
app.use('/api', authRoutes); // Auth is broader, put it last among /api paths

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'UP', 
        time: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'
    });
});


// MongoDB Connection
console.log('Attempting to connect to MongoDB Atlas...');
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    family: 4, // Force IPv4 (Fixes many SSL/TLS issues on Windows)
})
    .then(async () => {
        console.log('✅ Success: Connected to MongoDB Atlas');

        // Fix for unique index error on "products" collection
        try {
            const Product = require('./models/Product');
            const indexes = await Product.collection.listIndexes().toArray();
            const hasUniqueName = indexes.find(idx => idx.name === 'name_1' && idx.unique);
            if (hasUniqueName) {
                console.log('⚠️ Found problematic unique index "name_1". Dropping it...');
                await Product.collection.dropIndex('name_1');
                console.log('✅ Problematic index dropped.');
            }
        } catch (idxErr) {
            // Index might not exist or be unique, that's fine
        }
    })
    .catch(err => {
        console.error('❌ Error: MongoDB connection failed!');
        console.error('Reason:', err.message);
        console.log('\n💡 DEVELOPMENT MODE ACTIVE:');
        console.log('   The application will continue to run with limited functionality.');
        console.log('   Check your MongoDB Atlas IP Whitelist (0.0.0.0/0 for testing).');
    });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack);
    res.status(500).json({ 
        error: 'Internal Server Error', 
        details: err.message 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running correctly on port ${PORT}`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);

    // Initialize scheduled tasks (Cron Jobs)
    initCronJobs();
});

