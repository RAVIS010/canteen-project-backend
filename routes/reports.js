const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Sale = require('../models/Sale');
const Transfer = require('../models/Transfer');

// Get report data and stats
router.get('/data', verifyToken, async (req, res) => {
    try {
        const { duration, location } = req.query;
        // Support multiple locations via comma-separated string
        const locations = (location || 'canteen 1').split(',').map(loc => loc.trim().toLowerCase());

        // Define date range
        let startDate = new Date();

        if (duration === 'Today') {
            startDate.setHours(0, 0, 0, 0); // Since midnight today
        } else if (duration === 'Last 1 Hour') {
            startDate.setHours(startDate.getHours() - 1); // Sliding 1h window
        } else if (duration === 'Last 24 Hours') {
            startDate.setHours(startDate.getHours() - 24); // Sliding 24h window
        } else if (duration === 'Last 7 Days') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (duration === 'Last 30 Days') {
            startDate.setDate(startDate.getDate() - 30);
        } else {
            // Default to start of today for any other value (like "Last 24 Hours" legacy or initial load)
            startDate.setHours(0, 0, 0, 0);
        }

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        // Fetch sales within range for all specified locations
        const sales = await Sale.find({
            location: { $in: locations },
            createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: -1 });

        // Fetch stats (Today only for live updates)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const billsResult = await Sale.countDocuments({
            location: { $in: locations },
            createdAt: { $gte: todayStart, $lte: endDate }
        });

        const transfersResult = await Transfer.aggregate([
            {
                $match: {
                    from: { $in: locations },
                    status: { $ne: 'Returned' },
                    createdAt: { $gte: todayStart, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalQty: { $sum: '$quantity' }
                }
            }
        ]);

        const returnsResult = await Transfer.aggregate([
            {
                $match: {
                    from: { $in: locations },
                    status: 'Returned',
                    createdAt: { $gte: todayStart, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalQty: { $sum: '$quantity' }
                }
            }
        ]);

        res.json({
            sales,
            stats: {
                billsToday: billsResult,
                transferredToday: transfersResult.length > 0 ? transfersResult[0].totalQty : 0,
                returnedToday: returnsResult.length > 0 ? returnsResult[0].totalQty : 0
            }
        });
    } catch (error) {
        console.error('[Reports API] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get high-level dashboard stats for Admin
router.get('/dashboard-stats', verifyToken, async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // 1. Total Revenue Today
        const revenueResult = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$price' }
                }
            }
        ]);

        // 2. Total Bills and Breakdown Today
        const billsBreakdown = await Sale.aggregate([
            {
                $match: {
                    createdAt: { $gte: todayStart, $lte: todayEnd }
                }
            },
            {
                $group: {
                    _id: '$location',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    canteen: '$_id',
                    count: 1,
                    _id: 0
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalBills = billsBreakdown.reduce((sum, item) => sum + item.count, 0);

        res.json({
            totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0,
            totalBills,
            billsBreakdown
        });
    } catch (error) {
        console.error('[Reports API] Dashboard Stats Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
