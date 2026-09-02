// src/services/audit.service.js
/**
 * Audit Service
 * =============
 * Business logic layer for audit logging.
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

        // Get total count for pagination
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
     * Gets audit logs for a specific record.
     * 
     * @async
     * @param {string} tableName - Table name
     * @param {string} recordId - Record ID
     * @param {number} [limit=50] - Max results
     * @returns {Promise<Array>} Audit logs
     */
    async getRecordAuditLogs(tableName, recordId, limit = 50) {
        return await auditRepository.getRecordAuditLogs(tableName, recordId, limit);
    }

    /**
     * Gets audit logs by user.
     * 
     * @async
     * @param {string} userId - User UUID
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Array>} Audit logs
     */
    async getUserAuditLogs(userId, days = 30) {
        return await auditRepository.getUserAuditLogs(userId, days);
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

        // JSON format
        const logs = await auditRepository.getAuditLogs(filters);
        return JSON.stringify(logs, null, 2);
    }
}

module.exports = new AuditService();