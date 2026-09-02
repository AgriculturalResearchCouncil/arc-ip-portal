/**
 * Audit Controller
 * ================
 * HTTP handlers for audit endpoints.
 * 
 * @module controllers/audit.controller
 * @requires ../services/audit.service
 * @requires ../middleware/error.middleware
 */

const auditService = require('../services/audit.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Gets audit logs with filtering.
 * 
 * @route GET /api/v1/audit/logs
 * @access Private - Admin only
 */
exports.getAuditLogs = catchAsync(async (req, res) => {
    const { tableName, recordId, action, changedBy, dateFrom, dateTo, page, limit } = req.query;

    const filters = {};
    if (tableName) filters.tableName = tableName;
    if (recordId) filters.recordId = recordId;
    if (action) filters.action = action;
    if (changedBy) filters.changedBy = changedBy;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    const result = await auditService.getAuditLogs(filters);

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
    });
});

/**
 * Gets audit log by ID.
 * 
 * @route GET /api/v1/audit/logs/:auditId
 * @access Private - Admin only
 */
exports.getAuditById = catchAsync(async (req, res) => {
    const audit = await auditService.getAuditById(parseInt(req.params.auditId));

    if (!audit) {
        return res.status(404).json({
            success: false,
            message: 'Audit log not found'
        });
    }

    res.json({
        success: true,
        data: audit
    });
});

/**
 * Gets audit logs for a specific entity.
 * 
 * @route GET /api/v1/audit/entity/:entityType/:entityId
 * @access Private - Admin only
 */
exports.getEntityAuditLogs = catchAsync(async (req, res) => {
    const { entityType, entityId } = req.params;
    const { limit } = req.query;

    const logs = await auditService.getEntityAuditLogs(
        entityId,
        entityType,
        limit ? parseInt(limit) : 50
    );

    res.json({
        success: true,
        data: logs,
        count: logs.length
    });
});

/**
 * Gets user activity.
 * 
 * @route GET /api/v1/audit/user/:userId/activity
 * @access Private - Admin only
 */
exports.getUserActivity = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { days } = req.query;

    const activity = await auditService.getUserActivity(
        userId,
        days ? parseInt(days) : 30
    );

    res.json({
        success: true,
        data: activity,
        count: activity.length
    });
});

/**
 * Gets security events.
 * 
 * @route GET /api/v1/audit/security/events
 * @access Private - Admin only
 */
exports.getSecurityEvents = catchAsync(async (req, res) => {
    const { userId, dateFrom, dateTo, limit } = req.query;

    const filters = {};
    if (userId) filters.userId = userId;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);

    const events = await auditService.getSecurityEvents(filters);

    res.json({
        success: true,
        data: events,
        count: events.length
    });
});

/**
 * Gets failed login attempts.
 * 
 * @route GET /api/v1/audit/security/failed-logins
 * @access Private - Admin only
 */
exports.getFailedLogins = catchAsync(async (req, res) => {
    const { userId, hours } = req.query;

    const attempts = await auditService.getFailedLogins(
        userId || null,
        hours ? parseInt(hours) : 24
    );

    res.json({
        success: true,
        data: attempts,
        count: attempts.length
    });
});

/**
 * Gets audit statistics.
 * 
 * @route GET /api/v1/audit/statistics
 * @access Private - Admin only
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const { days } = req.query;

    const statistics = await auditService.getAuditStatistics(
        days ? parseInt(days) : 30
    );

    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Gets compliance report.
 * 
 * @route GET /api/v1/audit/compliance/report
 * @access Private - Admin only
 */
exports.getComplianceReport = catchAsync(async (req, res) => {
    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
        return res.status(400).json({
            success: false,
            message: 'Period start and end dates are required'
        });
    }

    const report = await auditService.getComplianceReport(periodStart, periodEnd);

    res.json({
        success: true,
        data: report,
        periodStart,
        periodEnd
    });
});

/**
 * Exports audit logs.
 * 
 * @route GET /api/v1/audit/export
 * @access Private - Admin only
 */
exports.exportAuditLogs = catchAsync(async (req, res) => {
    const { tableName, recordId, action, changedBy, dateFrom, dateTo, format, limit } = req.query;

    const filters = {};
    if (tableName) filters.tableName = tableName;
    if (recordId) filters.recordId = recordId;
    if (action) filters.action = action;
    if (changedBy) filters.changedBy = changedBy;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const exportFormat = format || 'csv';
    const maxRows = limit ? parseInt(limit) : 10000;
    const data = await auditService.exportAuditLogs(filters, exportFormat, maxRows);

    if (exportFormat === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(data);
    }

    res.json({
        success: true,
        data: JSON.parse(data)
    });
});

/**
 * Logs a custom audit event.
 * 
 * @route POST /api/v1/audit/log
 * @access Private - Admin only
 */
exports.logCustomEvent = catchAsync(async (req, res) => {
    const { actionType, entityType, entityId, actionDescription, details } = req.body;

    if (!actionType || !entityType) {
        return res.status(400).json({
            success: false,
            message: 'Action type and entity type are required'
        });
    }

    const auditId = await auditService.logEvent({
        userId: req.user.person_id,
        actionType,
        entityType,
        entityId,
        actionDescription,
        details,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(201).json({
        success: true,
        data: { auditId },
        message: 'Audit event logged successfully'
    });
});