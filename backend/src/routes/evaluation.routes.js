// src/routes/evaluation.routes.js
/**
 * Technology Evaluation Routes
 * =============================
 * Defines REST API endpoints for technology evaluation management.
 * Covers BPS Process 3 (Assessment) and Process 4 (IP Strategy Decision).
 * 
 * Process 3: Assessment and Prior Art Review
 * - POST /evaluations - Create evaluation (Step 1-2)
 * - POST /evaluations/:id/criteria - Add criteria (Step 3-10)
 * - POST /evaluations/:id/searches - Record search (Step 6-8)
 * - POST /evaluations/:id/complete - Complete evaluation (Step 11-12)
 * 
 * Process 4: IP Strategy Decision
 * - POST /evaluations/:id/strategies - Create strategies (Step 1-8)
 * - PATCH /strategies/:id/approve - Approve strategy (Step 8)
 * - POST /evaluations/:id/roadmaps - Create roadmap (Step 9)
 * 
 * @module routes/evaluation.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/evaluation.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const evaluationController = require('../controllers/evaluation.controller');

// All evaluation routes require authentication
router.use(authenticate);

// ============================================================
// BPS Process 3: Assessment and Prior Art Review
// ============================================================

/**
 * @route POST /api/v1/evaluations
 * @description Create a new evaluation (Process 3 Step 1-2)
 * @access TTO Officer, Admin
 */
router.post(
    '/',
    authorize('TTO Officer', 'Admin'),
    evaluationController.create
);

/**
 * @route POST /api/v1/evaluations/:id/criteria
 * @description Add assessment criteria (Process 3 Step 3-10)
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/criteria',
    authorize('TTO Officer', 'Admin'),
    evaluationController.addCriteria
);

/**
 * @route POST /api/v1/evaluations/:id/searches
 * @description Record prior art search (Process 3 Step 6-8)
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/searches',
    authorize('TTO Officer', 'Admin'),
    evaluationController.recordSearch
);

/**
 * @route POST /api/v1/evaluations/:id/complete
 * @description Complete evaluation with findings (Process 3 Step 11-12)
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/complete',
    authorize('TTO Officer', 'Admin'),
    evaluationController.complete
);

// ============================================================
// BPS Process 4: IP Strategy Decision
// ============================================================

/**
 * @route POST /api/v1/evaluations/:id/strategies
 * @description Create protection strategies (Process 4 Step 1-8)
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/strategies',
    authorize('TTO Officer', 'Admin'),
    evaluationController.createStrategies
);

/**
 * @route PATCH /api/v1/strategies/:id/approve
 * @description Approve protection strategy (Process 4 Step 8)
 * @access TTO Officer, Admin
 */
router.patch(
    '/strategies/:id/approve',
    authorize('TTO Officer', 'Admin'),
    evaluationController.approveStrategy
);

/**
 * @route POST /api/v1/evaluations/:id/roadmaps
 * @description Create protection roadmap (Process 4 Step 9)
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/roadmaps',
    authorize('TTO Officer', 'Admin'),
    evaluationController.createRoadmap
);

// ============================================================
// Retrieval and Search Endpoints
// ============================================================

/**
 * @route GET /api/v1/evaluations
 * @description Get all evaluations with filtering
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/',
    authorize('TTO Officer', 'Admin', 'Executive'),
    evaluationController.findAll
);

/**
 * @route GET /api/v1/evaluations/statistics
 * @description Get evaluation statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    evaluationController.getStatistics
);

/**
 * @route GET /api/v1/evaluations/search
 * @description Search evaluations
 * @access TTO Officer, Admin
 */
router.get(
    '/search',
    authorize('TTO Officer', 'Admin'),
    evaluationController.search
);

/**
 * @route GET /api/v1/evaluations/disclosure/:disclosureId
 * @description Get evaluations by disclosure
 * @access TTO Officer, Admin
 */
router.get(
    '/disclosure/:disclosureId',
    authorize('TTO Officer', 'Admin'),
    evaluationController.findByDisclosure
);

/**
 * @route GET /api/v1/evaluations/:id
 * @description Get evaluation by ID
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/:id',
    authorize('TTO Officer', 'Admin', 'Executive'),
    evaluationController.findById
);

/**
 * @route PATCH /api/v1/evaluations/:id/status
 * @description Update evaluation status
 * @access TTO Officer, Admin
 */
router.patch(
    '/:id/status',
    authorize('TTO Officer', 'Admin'),
    evaluationController.updateStatus
);

/**
 * @route POST /api/v1/evaluations/:id/approve
 * @description Approve evaluation
 * @access TTO Officer, Admin
 */
router.post(
    '/:id/approve',
    authorize('TTO Officer', 'Admin'),
    evaluationController.approve
);

module.exports = router;