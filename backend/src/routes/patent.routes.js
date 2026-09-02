// src/routes/patent.routes.js
/**
 * Patent Routes
 * =============
 * Defines REST API endpoints for patent management.
 * All routes require authentication and appropriate role authorization.
 * 
 * @module routes/patent.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/patent.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const patentController = require('../controllers/patent.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/patents
 * @description Create a patent from disclosure
 * @access TTO Officer, Admin
 */
router.post(
    '/',
    authorize('TTO Officer', 'Admin'),
    patentController.create
);

/**
 * @route GET /api/v1/patents
 * @description Get all patents with filtering
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/',
    authorize('TTO Officer', 'Admin', 'Executive'),
    patentController.findAll
);

/**
 * @route GET /api/v1/patents/statistics
 * @description Get patent statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    patentController.getStatistics
);

/**
 * @route GET /api/v1/patents/renewals/pending
 * @description Get pending renewals
 * @access TTO Officer, Admin
 */
router.get(
    '/renewals/pending',
    authorize('TTO Officer', 'Admin'),
    patentController.getPendingRenewals
);

/**
 * @route GET /api/v1/patents/expiring
 * @description Get patents expiring soon
 * @access TTO Officer, Admin
 */
router.get(
    '/expiring',
    authorize('TTO Officer', 'Admin'),
    patentController.getExpiringSoon
);

/**
 * @route GET /api/v1/patents/search
 * @description Search patents
 * @access TTO Officer, Admin
 */
router.get(
    '/search',
    authorize('TTO Officer', 'Admin'),
    patentController.search
);

/**
 * @route GET /api/v1/patents/application/:number
 * @description Get patent by application number
 * @access TTO Officer, Admin
 */
router.get(
    '/application/:number',
    authorize('TTO Officer', 'Admin'),
    patentController.findByApplicationNumber
);

/**
 * @route GET /api/v1/patents/:id
 * @description Get patent by ID
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/:id',
    authorize('TTO Officer', 'Admin', 'Executive'),
    patentController.findById
);

/**
 * @route PATCH /api/v1/patents/:id/status
 * @description Update patent status
 * @access TTO Officer, Admin
 */
router.patch(
    '/:id/status',
    authorize('TTO Officer', 'Admin'),
    patentController.updateStatus
);

/**
 * @route POST /api/v1/patents/:id/renewals
 * @description Record patent renewal
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/renewals',
    authorize('TTO Officer', 'Admin'),
    patentController.recordRenewal
);

module.exports = router;