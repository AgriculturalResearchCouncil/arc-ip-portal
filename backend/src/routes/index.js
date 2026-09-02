/**
 * Routes Index
 * ============
 * Aggregates and exports all route modules.
 * Provides the main API router with all endpoints.
 * 
 * @module routes/index
 * @requires express
 */

// src/routes/index.js - Updated with commercialisation routes
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const disclosureRoutes = require('./disclosure.routes');
const ipAssetRoutes = require('./ip-asset.routes');
const documentRoutes = require('./document.routes');

// IP Type Routes
const patentRoutes = require('./patent.routes');
const pbrRoutes = require('./pbr.routes');
const trademarkRoutes = require('./trademark.routes');
const copyrightRoutes = require('./copyright.routes');
const tradeSecretRoutes = require('./trade-secret.routes');
const designRoutes = require('./design.routes');

// Licensing Routes
const licenceRoutes = require('./licence.routes');

// Technology Evaluation Routes
const evaluationRoutes = require('./evaluation.routes');

// Commercialisation Routes
const commercialisationRoutes = require('./commercialisation.routes');

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/disclosures', disclosureRoutes);
router.use('/ip-assets', ipAssetRoutes);
router.use('/documents', documentRoutes);

// IP Type endpoints
router.use('/patents', patentRoutes);
router.use('/pbr', pbrRoutes);
router.use('/trademarks', trademarkRoutes);
router.use('/copyrights', copyrightRoutes);
router.use('/trade-secrets', tradeSecretRoutes);
router.use('/designs', designRoutes);

// Licensing endpoints
router.use('/licences', licenceRoutes);

// Technology Evaluation endpoints
router.use('/evaluations', evaluationRoutes);

// Commercialisation endpoints
router.use('/commercialisations', commercialisationRoutes);

// API info
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
            documents: '/api/v1/documents',
            patents: '/api/v1/patents',
            pbr: '/api/v1/pbr',
            trademarks: '/api/v1/trademarks',
            copyrights: '/api/v1/copyrights',
            tradeSecrets: '/api/v1/trade-secrets',
            designs: '/api/v1/designs',
            licences: '/api/v1/licences',
            evaluations: '/api/v1/evaluations',
            commercialisations: '/api/v1/commercialisations'
        }
    });
});

module.exports = router;