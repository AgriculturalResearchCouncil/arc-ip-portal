/**
 * IP Asset Routes
 * ===============
 * Defines REST API endpoints for IP asset management.
 * All routes require authentication and appropriate role authorization.
 * 
 * @module routes/ip-asset.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/ip-asset.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ipAssetController = require('../controllers/ip-asset.controller');

// All IP asset routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/ip-assets
 * @description Create a new IP asset
 * @access Researcher, TTO Officer, Admin
 */
router.post(
    '/',
    authorize('Researcher', 'TTO Officer', 'Admin'),
    ipAssetController.create
);

/**
 * @route GET /api/v1/ip-assets/my
 * @description Get researcher's own IP assets
 * @access Researcher only
 */
router.get(
    '/my',
    authorize('Researcher'),
    ipAssetController.findMyAssets
);

/**
 * @route GET /api/v1/ip-assets
 * @description Get all IP assets with filtering
 * @access TTO Officer, Admin, Executive, Legal Officer
 */
router.get(
    '/',
    authorize('TTO Officer', 'Admin', 'Executive', 'Legal Officer'),
    ipAssetController.findAll
);

/**
 * @route GET /api/v1/ip-assets/statistics
 * @description Get IP asset statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    ipAssetController.getStatistics
);

/**
 * @route GET /api/v1/ip-assets/pending
 * @description Get pending IP assets for review
 * @access TTO Officer, Admin
 */
router.get(
    '/pending',
    authorize('TTO Officer', 'Admin'),
    ipAssetController.getPending
);

/**
 * @route GET /api/v1/ip-assets/search
 * @description Search IP assets
 * @access TTO Officer, Admin
 */
router.get(
    '/search',
    authorize('TTO Officer', 'Admin'),
    ipAssetController.search
);

/**
 * @route GET /api/v1/ip-assets/:id
 * @description Get IP asset by ID
 * @access TTO Officer, Admin, Executive, Legal Officer
 */
router.get(
    '/:id',
    authorize('TTO Officer', 'Admin', 'Executive', 'Legal Officer'),
    ipAssetController.findById
);

/**
 * @route PATCH /api/v1/ip-assets/:id/status
 * @description Update IP asset status
 * @access TTO Officer, Admin
 */
router.patch(
    '/:id/status',
    authorize('TTO Officer', 'Admin'),
    ipAssetController.updateStatus
);

module.exports = router;