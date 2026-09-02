// src/routes/licence.routes.js
/**
 * Licence Routes
 * ==============
 * Defines REST API endpoints for licence management.
 * All routes require authentication and appropriate role authorization.
 * 
 * @module routes/licence.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/licence.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const licenceController = require('../controllers/licence.controller');

// All licence routes require authentication
router.use(authenticate);

// ============================================================
// Licence CRUD Operations
// ============================================================

/**
 * @route POST /api/v1/licences
 * @description Create a new licence
 * @access TTO Officer, Admin
 */
router.post(
    '/',
    authorize('TTO Officer', 'Admin'),
    licenceController.create
);

/**
 * @route GET /api/v1/licences
 * @description Get all licences with filtering
 * @access TTO Officer, Admin, Executive, Legal
 */
router.get(
    '/',
    authorize('TTO Officer', 'Admin', 'Executive', 'Legal'),
    licenceController.findAll
);

/**
 * @route GET /api/v1/licences/statistics
 * @description Get licence statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    licenceController.getStatistics
);

/**
 * @route GET /api/v1/licences/expiring
 * @description Get licences expiring soon
 * @access TTO Officer, Admin
 */
router.get(
    '/expiring',
    authorize('TTO Officer', 'Admin'),
    licenceController.getExpiringSoon
);

/**
 * @route GET /api/v1/licences/search
 * @description Search licences
 * @access TTO Officer, Admin
 */
router.get(
    '/search',
    authorize('TTO Officer', 'Admin'),
    licenceController.search
);

/**
 * @route GET /api/v1/licences/ip-record/:ipRecordId
 * @description Get licences by IP record
 * @access TTO Officer, Admin
 */
router.get(
    '/ip-record/:ipRecordId',
    authorize('TTO Officer', 'Admin'),
    licenceController.findByIpRecord
);

/**
 * @route GET /api/v1/licences/ip-record/:ipRecordId/active
 * @description Get active licences for IP record
 * @access TTO Officer, Admin
 */
router.get(
    '/ip-record/:ipRecordId/active',
    authorize('TTO Officer', 'Admin'),
    licenceController.getActiveLicences
);

/**
 * @route GET /api/v1/licences/:id
 * @description Get licence by ID
 * @access TTO Officer, Admin, Executive, Legal
 */
router.get(
    '/:id',
    authorize('TTO Officer', 'Admin', 'Executive', 'Legal'),
    licenceController.findById
);

/**
 * @route PATCH /api/v1/licences/:id/status
 * @description Update licence status
 * @access TTO Officer, Admin
 */
router.patch(
    '/:id/status',
    authorize('TTO Officer', 'Admin'),
    licenceController.updateStatus
);

// ============================================================
// Licensee Management
// ============================================================

/**
 * @route POST /api/v1/licences/:id/licensees
 * @description Add licensee to licence
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/licensees',
    authorize('TTO Officer', 'Admin'),
    licenceController.addLicensee
);

/**
 * @route DELETE /api/v1/licensees/:id
 * @description Remove licensee from licence
 * @access TTO Officer, Admin
 */
router.delete(
    '/licensees/:id',
    authorize('TTO Officer', 'Admin'),
    licenceController.removeLicensee
);

// ============================================================
// Royalty Management
// ============================================================

/**
 * @route POST /api/v1/licences/:id/royalty-payments
 * @description Record royalty payment
 * @access Finance, Admin
 */
router.post(
    '/:id/royalty-payments',
    authorize('Finance', 'Admin'),
    licenceController.recordRoyaltyPayment
);

/**
 * @route GET /api/v1/licences/:id/royalty-payments
 * @description Get royalty payment history
 * @access Finance, Admin, TTO
 */
router.get(
    '/:id/royalty-payments',
    authorize('Finance', 'Admin', 'TTO Officer'),
    licenceController.getRoyaltyPayments
);

// ============================================================
// Obligation Management
// ============================================================

/**
 * @route GET /api/v1/licences/:id/obligations/pending
 * @description Get pending obligations
 * @access TTO Officer, Admin, Legal
 */
router.get(
    '/:id/obligations/pending',
    authorize('TTO Officer', 'Admin', 'Legal'),
    licenceController.getPendingObligations
);

/**
 * @route PATCH /api/v1/obligations/:id/status
 * @description Update obligation status
 * @access TTO Officer, Admin
 */
router.patch(
    '/obligations/:id/status',
    authorize('TTO Officer', 'Admin'),
    licenceController.updateObligationStatus
);

// ============================================================
// Milestone Management
// ============================================================

/**
 * @route GET /api/v1/licences/:id/milestones/upcoming
 * @description Get upcoming milestones
 * @access TTO Officer, Admin
 */
router.get(
    '/:id/milestones/upcoming',
    authorize('TTO Officer', 'Admin'),
    licenceController.getUpcomingMilestones
);

/**
 * @route PATCH /api/v1/milestones/:id/status
 * @description Update milestone status
 * @access TTO Officer, Admin
 */
router.patch(
    '/milestones/:id/status',
    authorize('TTO Officer', 'Admin'),
    licenceController.updateMilestoneStatus
);

module.exports = router;