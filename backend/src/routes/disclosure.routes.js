/**
 * Disclosure Routes
 * =================
 * Defines REST API endpoints for disclosure management.
 * All routes require authentication and appropriate role authorization.
 * 
 * @module routes/disclosure.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/disclosure.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const disclosureController = require('../controllers/disclosure.controller');

/**
 * All disclosure routes require authentication
 * This ensures every request has a valid JWT token
 */
router.use(authenticate);

// ============================================================
// Researcher Routes
// ============================================================

/**
 * @route POST /api/v1/disclosures
 * @description Create a new disclosure
 * @access Researcher, TTO Officer, Admin
 */
router.post(
    '/',
    authorize('Researcher', 'TTO Officer', 'Admin'),
    disclosureController.create
);

/**
 * @route GET /api/v1/disclosures/my
 * @description Get current researcher's disclosures
 * @access Researcher only
 */
router.get(
    '/my',
    authorize('Researcher'),
    disclosureController.findMyDisclosures
);

/**
 * @route POST /api/v1/disclosures/:id/submit
 * @description Submit disclosure for review
 * @access Researcher only (must be owner)
 */
router.post(
    '/:id/submit',
    authorize('Researcher'),
    disclosureController.submit
);

// ============================================================
// TTO and Admin Routes
// ============================================================

/**
 * @route GET /api/v1/disclosures
 * @description Get all disclosures with filtering
 * @access TTO Officer, Admin, Executive, Legal Officer
 */
router.get(
    '/',
    authorize('TTO Officer', 'Admin', 'Executive', 'Legal Officer'),
    disclosureController.findAll
);

/**
 * @route GET /api/v1/disclosures/statistics
 * @description Get disclosure statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    disclosureController.getStatistics
);

/**
 * @route GET /api/v1/disclosures/pending
 * @description Get pending disclosures for review
 * @access TTO Officer, Admin
 */
router.get(
    '/pending',
    authorize('TTO Officer', 'Admin'),
    disclosureController.getPendingReviews
);

/**
 * @route GET /api/v1/disclosures/categories
 * @description Get category breakdown
 * @access TTO Officer, Admin
 */
router.get(
    '/categories',
    authorize('TTO Officer', 'Admin'),
    disclosureController.getCategoryBreakdown
);

/**
 * @route GET /api/v1/disclosures/trends
 * @description Get monthly trends
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/trends',
    authorize('TTO Officer', 'Admin', 'Executive'),
    disclosureController.getTrends
);

/**
 * @route GET /api/v1/disclosures/search
 * @description Search disclosures
 * @access TTO Officer, Admin
 */
router.get(
    '/search',
    authorize('TTO Officer', 'Admin'),
    disclosureController.search
);

/**
 * @route GET /api/v1/disclosures/:id
 * @description Get disclosure by ID
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/:id',
    authorize('TTO Officer', 'Admin', 'Executive'),
    disclosureController.findById
);

/**
 * @route POST /api/v1/disclosures/:id/review
 * @description Review disclosure (TTO only)
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/review',
    authorize('TTO Officer', 'Admin'),
    disclosureController.review
);

module.exports = router;