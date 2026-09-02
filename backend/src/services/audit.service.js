/**
 * Audit Service
 * =============
 * Business logic layer for audit logging and compliance.
 * 
 * Database Schema Notes:
 * - audit_logs table has: audit_log_id (bigint, auto-increment), table_name, record_id,
 *   action, old_values, new_values, changed_by, ip_address, user_agent, changed_at
 * 
 * @module services/audit.service
 * @requires ../database/repositories/audit.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const auditRepository = require('../database/repositories/audit.repository');
const { ValidationError } = require('../errors/app-error');
const logger = require('../logging/logger');

/**
 * AuditService class containing all audit business logic.
 * 
 * @class AuditService
 */
class AuditService {
    /**
     * Logs an audit event.
     * 
     * @async
     * @param {Object} data - Audit data
     * @param {string} data.tableName - Table name
     * @param {string} data.recordId - Record ID
     * @param {string} data.action - Action type (INSERT, UPDATE, DELETE)
     * @param {Object} [data.oldValues] - Old values
     * @param {Object} [data.newValues] - New values
     * @param {string} [data.changedBy] - User UUID
     * @param {string} [data.ipAddress] - IP address
     * @param {string} [data.userAgent] - User agent
     * @returns {Promise<number>} Audit log ID
     */
    async logEvent(data) {
        try {
            const auditId = await auditRepository.logEvent(data);
            logger.debug('Audit event logged', { auditId, tableName: data.tableName, action: data.action });
            return auditId;
        } catch (error) {
            logger.error('Error logging audit event:', error);
            throw error;
        }
    }

    /**
     * Gets audit logs with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {number} [filters.page] - Page number
     * @param {number} [filters.limit] - Items per page
     * @returns {Promise<Object>} Audit logs with pagination
     */
    async getAuditLogs(filters = {}) {
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const offset = (page - 1) * limit;

        const logs = await auditRepository.getAuditLogs({
            ...filters,
            limit,
            offset
        });

        const countResult = await auditRepository.getAuditStatistics();
        const total = countResult.total_events || logs.length;

        return {
            data: logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Gets audit logs for a specific entity.
     * 
     * @async
     * @param {string} entityId - Entity UUID
     * @param {string} entityType - Entity type
     * @param {number} [limit=50] - Max results
     * @returns {Promise<Array>} Audit logs
     */
    async getEntityAuditLogs(entityId, entityType, limit = 50) {
        return await auditRepository.getEntityAuditLogs(entityId, entityType, limit);
    }

    /**
     * Gets user activity.
     * 
     * @async
     * @param {string} userId - User UUID
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Array>} User activity
     */
    async getUserActivity(userId, days = 30) {
        return await auditRepository.getUserActivity(userId, days);
    }

    /**
     * Gets security events.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.userId] - User UUID
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit=50] - Max results
     * @returns {Promise<Array>} Security events
     */
    async getSecurityEvents(filters = {}) {
        return await auditRepository.getSecurityEvents(filters);
    }

    /**
     * Gets failed login attempts.
     * 
     * @async
     * @param {string} [userId] - Optional user filter
     * @param {number} [hours=24] - Hours to look back
     * @returns {Promise<Array>} Failed login attempts
     */
    async getFailedLogins(userId = null, hours = 24) {
        return await auditRepository.getFailedLogins(userId, hours);
    }

    /**
     * Gets audit statistics.
     * 
     * @async
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Object>} Audit statistics
     */
    async getAuditStatistics(days = 30) {
        return await auditRepository.getAuditStatistics(days);
    }

    /**
     * Gets compliance report.
     * 
     * @async
     * @param {string} periodStart - Period start
     * @param {string} periodEnd - Period end
     * @returns {Promise<Object>} Compliance report data
     */
    async getComplianceReport(periodStart, periodEnd) {
        return await auditRepository.getComplianceReport(periodStart, periodEnd);
    }

    /**
     * Gets audit log by ID.
     * 
     * @async
     * @param {number} auditId - Audit log ID
     * @returns {Promise<Object|null>} Audit log
     */
    async getAuditById(auditId) {
        return await auditRepository.getAuditById(auditId);
    }

    /**
     * Exports audit logs.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [format='csv'] - Export format
     * @param {number} [limit=10000] - Max rows
     * @returns {Promise<string>} Exported data
     */
    async exportAuditLogs(filters = {}, format = 'csv', limit = 10000) {
        const data = await auditRepository.exportAuditLogs(filters, limit);
        
        if (format === 'csv') {
            return data;
        }

        const logs = await auditRepository.getAuditLogs(filters);
        return JSON.stringify(logs, null, 2);
    }

    /**
     * Logs an INSERT event.
     * 
     * @async
     * @param {string} tableName - Table name
     * @param {string} recordId - Record ID
     * @param {Object} newValues - New values
     * @param {string} [changedBy] - User UUID
     * @param {string} [ipAddress] - IP address
     * @param {string} [userAgent] - User agent
     * @returns {Promise<number>} Audit log ID
     */
    async logInsert(tableName, recordId, newValues, changedBy = null, ipAddress = null, userAgent = null) {
        return await auditRepository.logInsert(tableName, recordId, newValues, changedBy, ipAddress, userAgent);
    }

    /**
     * Logs an UPDATE event.
     * 
     * @async
     * @param {string} tableName - Table name
     * @param {string} recordId - Record ID
     * @param {Object} oldValues - Old values
     * @param {Object} newValues - New values
     * @param {string} [changedBy] - User UUID
     * @param {string} [ipAddress] - IP address
     * @param {string} [userAgent] - User agent
     * @returns {Promise<number>} Audit log ID
     */
    async logUpdate(tableName, recordId, oldValues, newValues, changedBy = null, ipAddress = null, userAgent = null) {
        return await auditRepository.logUpdate(tableName, recordId, oldValues, newValues, changedBy, ipAddress, userAgent);
    }

    /**
     * Logs a DELETE event.
     * 
     * @async
     * @param {string} tableName - Table name
     * @param {string} recordId - Record ID
     * @param {Object} oldValues - Old values
     * @param {string} [changedBy] - User UUID
     * @param {string} [ipAddress] - IP address
     * @param {string} [userAgent] - User agent
     * @returns {Promise<number>} Audit log ID
     */
    async logDelete(tableName, recordId, oldValues, changedBy = null, ipAddress = null, userAgent = null) {
        return await auditRepository.logDelete(tableName, recordId, oldValues, changedBy, ipAddress, userAgent);
    }

    /**
     * Gets audit logs by table.
     * 
     * @async
     * @param {string} tableName - Table name
     * @param {number} [limit=100] - Max results
     * @returns {Promise<Array>} Audit logs
     */
    async getTableAuditLogs(tableName, limit = 100) {
        return await auditRepository.getTableAuditLogs(tableName, limit);
    }

    /**
     * Gets audit logs by date range.
     * 
     * @async
     * @param {string} dateFrom - From date
     * @param {string} dateTo - To date
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Audit logs
     */
    async getAuditLogsByDateRange(dateFrom, dateTo, limit = null) {
        return await auditRepository.getAuditLogsByDateRange(dateFrom, dateTo, limit);
    }

    /**
     * Gets audit summary by table.
     * 
     * @async
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Array>} Summary by table
     */
    async getAuditSummaryByTable(days = 30) {
        return await auditRepository.getAuditSummaryByTable(days);
    }
}

module.exports = new AuditService();