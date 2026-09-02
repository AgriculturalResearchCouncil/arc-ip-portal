// src/routes/commercialisation.routes.js
/**
 * Commercialisation Routes
 * ========================
 * Defines REST API endpoints for commercialisation management.
 * Covers BPS Process 6: Commercialisation.
 * 
 * @module routes/commercialisation.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/commercialisation.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const commercialisationController = require('../controllers/commercialisation.controller');

// All routes require authentication
router.use(authenticate);

// ============================================================
// Commercialisation Project Management
// ============================================================

/**
 * @route POST /api/v1/commercialisations
 * @description Create a new commercialisation project
 * @access TTO Officer, Admin
 */
router.post(
    '/',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.create
);

/**
 * @route PUT /api/v1/commercialisations/:id
 * @description Update a commercialisation project
 * @access TTO Officer, Admin
 */
router.put(
    '/:id',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.update
);

/**
 * @route GET /api/v1/commercialisations
 * @description Get all commercialisation projects with filtering
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/',
    authorize('TTO Officer', 'Admin', 'Executive'),
    commercialisationController.findAll
);

/**
 * @route GET /api/v1/commercialisations/statistics
 * @description Get commercialisation statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    commercialisationController.getStatistics
);

/**
 * @route GET /api/v1/commercialisations/search
 * @description Search commercialisation projects
 * @access TTO Officer, Admin
 */
router.get(
    '/search',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.search
);

/**
 * @route GET /api/v1/commercialisations/ip-record/:ipRecordId
 * @description Get commercialisation projects by IP record
 * @access TTO Officer, Admin
 */
router.get(
    '/ip-record/:ipRecordId',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.findByIpRecord
);

/**
 * @route GET /api/v1/commercialisations/model/:model
 * @description Get commercialisation projects by model
 * @access TTO Officer, Admin
 */
router.get(
    '/model/:model',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.findByModel
);

/**
 * @route GET /api/v1/commercialisations/:id
 * @description Get commercialisation project by ID
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/:id',
    authorize('TTO Officer', 'Admin', 'Executive'),
    commercialisationController.findById
);

/**
 * @route PATCH /api/v1/commercialisations/:id/status
 * @description Update commercialisation status
 * @access TTO Officer, Admin
 */
router.patch(
    '/:id/status',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.updateStatus
);

// ============================================================
// Market Assessment Management
// ============================================================

/**
 * @route POST /api/v1/commercialisations/market-assessment
 * @description Conduct a market assessment
 * @access TTO Officer, Admin
 */
router.post(
    '/market-assessment',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.conductMarketAssessment
);

/**
 * @route GET /api/v1/commercialisations/market-assessments/:disclosureId
 * @description Get market assessments by disclosure
 * @access TTO Officer, Admin
 */
router.get(
    '/market-assessments/:disclosureId',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.getMarketAssessments
);

/**
 * @route GET /api/v1/commercialisations/market-assessment/:assessmentId
 * @description Get market assessment by ID
 * @access TTO Officer, Admin
 */
router.get(
    '/market-assessment/:assessmentId',
    authorize('TTO Officer', 'Admin'),
    commercialisationController.getMarketAssessmentById
);

module.exports = router;