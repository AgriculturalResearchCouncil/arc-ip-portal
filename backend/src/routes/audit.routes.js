/**
 * Audit Routes
 * ============
 * Defines REST API endpoints for audit and compliance.
 * 
 * @module routes/audit.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/audit.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const auditController = require('../controllers/audit.controller');

// All routes require authentication and admin access
router.use(authenticate);
router.use(authorize('Admin'));

/**
 * @route GET /api/v1/audit/logs
 * @description Get audit logs with filtering
 * @access Admin only
 */
router.get('/logs', auditController.getAuditLogs);

/**
 * @route GET /api/v1/audit/logs/:auditId
 * @description Get audit log by ID
 * @access Admin only
 */
router.get('/logs/:auditId', auditController.getAuditById);

/**
 * @route GET /api/v1/audit/entity/:entityType/:entityId
 * @description Get audit logs for a specific entity
 * @access Admin only
 */
router.get('/entity/:entityType/:entityId', auditController.getEntityAuditLogs);

/**
 * @route GET /api/v1/audit/user/:userId/activity
 * @description Get user activity
 * @access Admin only
 */
router.get('/user/:userId/activity', auditController.getUserActivity);

/**
 * @route GET /api/v1/audit/security/events
 * @description Get security events
 * @access Admin only
 */
router.get('/security/events', auditController.getSecurityEvents);

/**
 * @route GET /api/v1/audit/security/failed-logins
 * @description Get failed login attempts
 * @access Admin only
 */
router.get('/security/failed-logins', auditController.getFailedLogins);

/**
 * @route GET /api/v1/audit/statistics
 * @description Get audit statistics
 * @access Admin only
 */
router.get('/statistics', auditController.getStatistics);

/**
 * @route GET /api/v1/audit/compliance/report
 * @description Get compliance report
 * @access Admin only
 */
router.get('/compliance/report', auditController.getComplianceReport);

/**
 * @route GET /api/v1/audit/export
 * @description Export audit logs
 * @access Admin only
 */
router.get('/export', auditController.exportAuditLogs);

/**
 * @route POST /api/v1/audit/log
 * @description Log custom audit event
 * @access Admin only
 */
router.post('/log', auditController.logCustomEvent);

module.exports = router;