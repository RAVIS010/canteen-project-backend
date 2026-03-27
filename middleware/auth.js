const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        req.user = decoded;
        next();
    } catch (error) {
        let errorMsg = 'Invalid token.';
        if (error.name === 'TokenExpiredError') {
            errorMsg = 'Token expired. Please login again.';
        } else if (error.name === 'JsonWebTokenError') {
            errorMsg = 'Malformed or invalid token.';
        }
        res.status(400).json({ error: errorMsg, details: error.message });
    }
};

/**
 * Middleware to check user roles
 * @param {string[]} roles - Array of allowed roles
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
        }

        next();
    };
};

module.exports = {
    verifyToken,
    checkRole
};
