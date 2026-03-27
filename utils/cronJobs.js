const cron = require('node-cron');
const Product = require('../models/Product');
const Production = require('../models/Production');

/**
 * Scheduled job to reset stock quantities to 0 every day at 1:35 AM.
 * This covers both Product stock and Production quantities.
 */
const initCronJobs = () => {
    // Schedule for 12:00 AM (Midnight) every day
    // Format: minute hour day-of-month month day-of-week
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ Midnight maintenance job started at 12:00 AM...');

        try {
            // STOCK PERSISTENCE: 
            // We NO LONGER reset stock to 0. Stock remains the same as per user request.
            // Daily Revenue/Sales in the dashboard are calculated by date, so they 
            // automatically "reset" to 0 for the new day in the UI display.

            console.log('✅ Daily transition complete. Stock preserved. UI revenue display will reset to 0.');
            console.log('🏁 Daily maintenance finished successfully.');
        } catch (error) {
            console.error('❌ Error during daily maintenance:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });

    console.log('📅 Midnight maintenance job scheduled for 12:00 AM daily.');
};

module.exports = { initCronJobs };
