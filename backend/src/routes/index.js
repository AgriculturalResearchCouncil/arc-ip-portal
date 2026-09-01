/**
 * Routes Index
 * ============
 * Aggregates and exports all route modules.
 * Provides the main API router with all endpoints.
 * 
 * @module routes/index
 * @requires express
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const disclosureRoutes = require('./disclosure.routes');
const ipAssetRoutes = require('./ip-asset.routes');
const documentRoutes = require('./document.routes');

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/disclosures', disclosureRoutes);
router.use('/ip-assets', ipAssetRoutes);
router.use('/documents', documentRoutes);

/**
 * @route GET /api/v1
 * @description API information endpoint
 * @access Public
 * @returns {Object} API information
 */
router.get('/', (req, res) => {
    res.json({
        name: 'ARC IP Portal API',
        version: '1.0.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/v1/auth',
            users: '/api/v1/users',
            disclosures: '/api/v1/disclosures',
            ipAssets: '/api/v1/ip-assets',
            documents: '/api/v1/documents'
        }
    });
});

/**
 * @route GET /api/v1/health
 * @description Health check endpoint
 * @access Public
 * @returns {Object} Health status
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

module.exports = router;