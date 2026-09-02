// src/routes/report.routes.js
/**
 * Report Routes
 * =============
 * Defines REST API endpoints for reporting and analytics.
 * 
 * @module routes/report.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/report.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const reportController = require('../controllers/report.controller');

// All routes require authentication
router.use(authenticate);

// ============================================================
// Dashboard Endpoints
// ============================================================

/**
 * @route GET /api/v1/reports/dashboard
 * @description Get user-specific dashboard
 * @access All authenticated users
 */
router.get(
    '/dashboard',
    reportController.getDashboard
);

/**
 * @route GET /api/v1/reports/dashboard/executive
 * @description Get Executive Dashboard
 * @access Executive, Admin
 */
router.get(
    '/dashboard/executive',
    authorize('Executive', 'Admin'),
    reportController.getExecutiveDashboard
);

/**
 * @route GET /api/v1/reports/dashboard/tto
 * @description Get TTO Dashboard
 * @access TTO Officer, Admin
 */
router.get(
    '/dashboard/tto',
    authorize('TTO Officer', 'Admin'),
    reportController.getTTODashboard
);

/**
 * @route GET /api/v1/reports/dashboard/researcher
 * @description Get Researcher Dashboard
 * @access Researcher
 */
router.get(
    '/dashboard/researcher',
    authorize('Researcher'),
    reportController.getResearcherDashboard
);

// ============================================================
// Report Endpoints
// ============================================================

/**
 * @route GET /api/v1/reports/ip-portfolio
 * @description Get IP Portfolio Report
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/ip-portfolio',
    authorize('TTO Officer', 'Admin', 'Executive'),
    reportController.getIpPortfolioReport
);

/**
 * @route GET /api/v1/reports/disclosures
 * @description Get Disclosure Report
 * @access TTO Officer, Admin
 */
router.get(
    '/disclosures',
    authorize('TTO Officer', 'Admin'),
    reportController.getDisclosureReport
);

/**
 * @route GET /api/v1/reports/patents
 * @description Get Patent Report
 * @access TTO Officer, Admin
 */
router.get(
    '/patents',
    authorize('TTO Officer', 'Admin'),
    reportController.getPatentReport
);

/**
 * @route GET /api/v1/reports/licensing
 * @description Get Licensing Report
 * @access TTO Officer, Admin, Legal, Finance
 */
router.get(
    '/licensing',
    authorize('TTO Officer', 'Admin', 'Legal', 'Finance'),
    reportController.getLicensingReport
);

/**
 * @route GET /api/v1/reports/royalties
 * @description Get Royalty Report
 * @access Finance, Admin
 */
router.get(
    '/royalties',
    authorize('Finance', 'Admin'),
    reportController.getRoyaltyReport
);

/**
 * @route GET /api/v1/reports/commercialisation
 * @description Get Commercialisation Report
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/commercialisation',
    authorize('TTO Officer', 'Admin', 'Executive'),
    reportController.getCommercialisationReport
);

/**
 * @route GET /api/v1/reports/evaluations
 * @description Get Evaluation Report
 * @access TTO Officer, Admin
 */
router.get(
    '/evaluations',
    authorize('TTO Officer', 'Admin'),
    reportController.getEvaluationReport
);

// ============================================================
// Analytics Endpoints
// ============================================================

/**
 * @route GET /api/v1/reports/ip-breakdown
 * @description Get IP Type Breakdown
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/ip-breakdown',
    authorize('TTO Officer', 'Admin', 'Executive'),
    reportController.getIpTypeBreakdown
);

/**
 * @route GET /api/v1/reports/trends
 * @description Get Monthly Trends
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/trends',
    authorize('TTO Officer', 'Admin', 'Executive'),
    reportController.getMonthlyTrends
);

/**
 * @route GET /api/v1/reports/export
 * @description Export report data
 * @access TTO Officer, Admin
 */
router.get(
    '/export',
    authorize('TTO Officer', 'Admin'),
    reportController.exportReport
);

module.exports = router;