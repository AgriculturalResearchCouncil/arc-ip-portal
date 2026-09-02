/**
 * Audit Repository
 * ================
 * Manages database operations for audit_logs table.
 * 
 * Database Schema (audit_logs):
 * - audit_log_id (bigint, PK, auto-increment)
 * - table_name (nvarchar, required)
 * - record_id (uniqueidentifier, required)
 * - action (nvarchar, required) - 'INSERT', 'UPDATE', 'DELETE'
 * - old_values (nvarchar, nullable) - JSON string of old values
 * - new_values (nvarchar, nullable) - JSON string of new values
 * - changed_by (uniqueidentifier, nullable, FK to persons)
 * - ip_address (nvarchar, nullable)
 * - user_agent (nvarchar, nullable)
 * - changed_at (datetime2, nullable)
 * 
 * Note: There is NO 'is_deleted' column in this table.
 * audit_log_id is a bigint auto-increment, not a GUID.
 * 
 * @module repositories/audit.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * AuditRepository class for managing audit logs.
 * 
 * @class AuditRepository
 * @extends BaseRepository
 */
class AuditRepository extends BaseRepository {
    constructor() {
        // Note: audit_log_id is bigint auto-increment, not a GUID
        super('audit_logs', 'audit_log_id');
    }

    /**
     * Logs an audit event.
     * 
     * @async
     * @param {Object} data - Audit data
     * @param {string} data.tableName - Table name being audited (required)
     * @param {string} data.recordId - Record ID being audited (required)
     * @param {string} data.action - Action type (INSERT, UPDATE, DELETE) (required)
     * @param {Object} [data.oldValues] - Old values (for UPDATE, DELETE)
     * @param {Object} [data.newValues] - New values (for INSERT, UPDATE)
     * @param {string} [data.changedBy] - User UUID
     * @param {string} [data.ipAddress] - IP address
     * @param {string} [data.userAgent] - User agent
     * @returns {Promise<number>} Audit log ID
     */
    async logEvent(data) {
        if (!data.tableName || !data.recordId || !data.action) {
            throw new Error('Table name, record ID, and action are required');
        }

        const validActions = ['INSERT', 'UPDATE', 'DELETE'];
        if (!validActions.includes(data.action.toUpperCase())) {
            throw new Error('Invalid action. Must be INSERT, UPDATE, or DELETE');
        }

        const query = `
            INSERT INTO audit_logs (
                table_name,
                record_id,
                action,
                old_values,
                new_values,
                changed_by,
                ip_address,
                user_agent,
                changed_at
            ) VALUES (
                @tableName,
                @recordId,
                @action,
                @oldValues,
                @newValues,
                @changedBy,
                @ipAddress,
                @userAgent,
                GETDATE()
            )
        `;

        const oldValues = data.oldValues ? JSON.stringify(data.oldValues) : null;
        const newValues = data.newValues ? JSON.stringify(data.newValues) : null;

        await executeQuery(query, [
            { name: 'tableName', value: data.tableName },
            { name: 'recordId', type: sql.UniqueIdentifier, value: data.recordId },
            { name: 'action', value: data.action.toUpperCase() },
            { name: 'oldValues', value: oldValues },
            { name: 'newValues', value: newValues },
            { name: 'changedBy', type: sql.UniqueIdentifier, value: data.changedBy || null },
            { name: 'ipAddress', value: data.ipAddress || null },
            { name: 'userAgent', value: data.userAgent || null }
        ]);

        // Get the last inserted ID (bigint)
        const idQuery = `SELECT SCOPE_IDENTITY() as id`;
        const result = await executeQuery(idQuery);
        const auditId = result.recordset[0]?.id || null;

        logger.info('Audit event logged', { auditId, tableName: data.tableName, action: data.action });
        return auditId;
    }

    /**
     * Gets audit logs with filtering.
     * 
     * @async
     * @param {Object} [filters={}] - Filter options
     * @param {string} [filters.tableName] - Table name
     * @param {string} [filters.recordId] - Record ID
     * @param {string} [filters.action] - Action type
     * @param {string} [filters.changedBy] - User UUID
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Audit logs
     */
    async getAuditLogs(filters = {}) {
        let query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name,
                p.email as changed_by_email
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.tableName) {
            query += ` AND al.table_name = @tableName`;
            params.push({ name: 'tableName', value: filters.tableName });
        }

        if (filters.recordId) {
            query += ` AND al.record_id = @recordId`;
            params.push({ name: 'recordId', type: sql.UniqueIdentifier, value: filters.recordId });
        }

        if (filters.action) {
            query += ` AND al.action = @action`;
            params.push({ name: 'action', value: filters.action.toUpperCase() });
        }

        if (filters.changedBy) {
            query += ` AND al.changed_by = @changedBy`;
            params.push({ name: 'changedBy', type: sql.UniqueIdentifier, value: filters.changedBy });
        }

        if (filters.dateFrom) {
            query += ` AND al.changed_at >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND al.changed_at <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY al.changed_at DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets audit logs for a specific entity.
     * 
     * @async
     * @param {string} recordId - Record UUID
     * @param {string} tableName - Table name
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Audit logs
     */
    async getEntityAuditLogs(recordId, tableName, limit = null) {
        if (!recordId || !tableName) {
            throw new Error('Record ID and table name are required');
        }

        let query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE al.record_id = @recordId AND al.table_name = @tableName
            ORDER BY al.changed_at DESC
        `;

        const params = [
            { name: 'recordId', type: sql.UniqueIdentifier, value: recordId },
            { name: 'tableName', value: tableName }
        ];

        if (limit) {
            query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
            params.push({ name: 'limit', value: limit });
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets audit statistics.
     * 
     * @async
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Object>} Audit statistics
     */
    async getAuditStatistics(days = 30) {
        const query = `
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT changed_by) as unique_users,
                COUNT(DISTINCT table_name) as table_count,
                COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
                COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
                COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
                COUNT(CASE WHEN changed_at >= DATEADD(day, -1, GETDATE()) THEN 1 END) as last_24h,
                COUNT(CASE WHEN changed_at >= DATEADD(day, -7, GETDATE()) THEN 1 END) as last_7d,
                COUNT(CASE WHEN changed_at >= DATEADD(day, -30, GETDATE()) THEN 1 END) as last_30d
            FROM audit_logs
            WHERE changed_at >= DATEADD(day, -@days, GETDATE())
        `;

        const result = await executeQuery(query, [
            { name: 'days', value: days }
        ]);

        return result.recordset[0] || {};
    }
}

module.exports = new AuditRepository();