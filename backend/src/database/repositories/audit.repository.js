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
        return await this.logEvent({
            tableName,
            recordId,
            action: 'INSERT',
            newValues,
            changedBy,
            ipAddress,
            userAgent
        });
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
        return await this.logEvent({
            tableName,
            recordId,
            action: 'UPDATE',
            oldValues,
            newValues,
            changedBy,
            ipAddress,
            userAgent
        });
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
        return await this.logEvent({
            tableName,
            recordId,
            action: 'DELETE',
            oldValues,
            changedBy,
            ipAddress,
            userAgent
        });
    }

    /**
     * Gets audit logs with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
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

    /**
     * Gets security events.
     * Filters for security-related actions.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.userId] - User UUID
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @returns {Promise<Array>} Security events
     */
    async getSecurityEvents(filters = {}) {
        let query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name,
                p.email as changed_by_email
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE al.action IN ('USER_LOGIN_FAILED', 'UNAUTHORIZED_ACCESS', 'SECURITY_ALERT', 'USER_LOGOUT')
        `;

        const params = [];

        if (filters.userId) {
            query += ` AND al.changed_by = @userId`;
            params.push({ name: 'userId', type: sql.UniqueIdentifier, value: filters.userId });
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
            query += ` OFFSET 0 ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
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
        let query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name,
                p.email as changed_by_email
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE al.action = 'USER_LOGIN_FAILED'
            AND al.changed_at >= DATEADD(hour, -@hours, GETDATE())
            ORDER BY al.changed_at DESC
        `;

        const params = [
            { name: 'hours', value: hours }
        ];

        if (userId) {
            query += ` AND al.changed_by = @userId`;
            params.push({ name: 'userId', type: sql.UniqueIdentifier, value: userId });
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets compliance report data.
     * 
     * @async
     * @param {string} periodStart - Period start
     * @param {string} periodEnd - Period end
     * @returns {Promise<Object>} Compliance report data
     */
    async getComplianceReport(periodStart, periodEnd) {
        const query = `
            SELECT 
                COUNT(*) as total_audit_events,
                COUNT(DISTINCT changed_by) as active_users,
                COUNT(DISTINCT table_name) as entity_types,
                COUNT(CASE WHEN action = 'INSERT' AND table_name = 'disclosures' THEN 1 END) as disclosures_created,
                COUNT(CASE WHEN action = 'UPDATE' AND table_name = 'disclosures' AND new_values LIKE '%review_status%' THEN 1 END) as disclosures_reviewed,
                COUNT(CASE WHEN action = 'INSERT' AND table_name = 'licence_records' THEN 1 END) as licences_created,
                COUNT(CASE WHEN action = 'INSERT' AND table_name = 'ip_records' THEN 1 END) as ip_records_created,
                COUNT(CASE WHEN action = 'USER_LOGIN_FAILED' THEN 1 END) as failed_logins,
                COUNT(CASE WHEN action = 'UNAUTHORIZED_ACCESS' THEN 1 END) as unauthorized_attempts,
                COUNT(CASE WHEN action = 'USER_LOGIN' THEN 1 END) as successful_logins
            FROM audit_logs
            WHERE changed_at >= @periodStart AND changed_at <= @periodEnd
        `;

        const result = await executeQuery(query, [
            { name: 'periodStart', value: periodStart },
            { name: 'periodEnd', value: periodEnd }
        ]);

        return result.recordset[0] || {};
    }

    /**
     * Gets audit log by ID.
     * 
     * @async
     * @param {number} auditId - Audit log ID
     * @returns {Promise<Object|null>} Audit log
     */
    async getAuditById(auditId) {
        if (!auditId) {
            throw new Error('Audit ID is required');
        }

        const query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name,
                p.email as changed_by_email
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE al.audit_log_id = @auditId
        `;

        const result = await executeQuery(query, [
            { name: 'auditId', value: auditId }
        ]);

        return result.recordset[0] || null;
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
        if (!tableName) {
            throw new Error('Table name is required');
        }

        const query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE al.table_name = @tableName
            ORDER BY al.changed_at DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'tableName', value: tableName },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
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
        if (!dateFrom || !dateTo) {
            throw new Error('Date from and date to are required');
        }

        let query = `
            SELECT 
                al.*,
                p.first_name + ' ' + p.last_name as changed_by_name
            FROM audit_logs al
            LEFT JOIN persons p ON al.changed_by = p.person_id
            WHERE al.changed_at >= @dateFrom AND al.changed_at <= @dateTo
            ORDER BY al.changed_at DESC
        `;

        const params = [
            { name: 'dateFrom', value: dateFrom },
            { name: 'dateTo', value: dateTo }
        ];

        if (limit) {
            query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
            params.push({ name: 'limit', value: limit });
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets audit summary by table.
     * 
     * @async
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Array>} Summary by table
     */
    async getAuditSummaryByTable(days = 30) {
        const query = `
            SELECT 
                table_name,
                COUNT(*) as total_changes,
                COUNT(CASE WHEN action = 'INSERT' THEN 1 END) as inserts,
                COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
                COUNT(CASE WHEN action = 'DELETE' THEN 1 END) as deletes,
                COUNT(DISTINCT changed_by) as unique_users
            FROM audit_logs
            WHERE changed_at >= DATEADD(day, -@days, GETDATE())
            GROUP BY table_name
            ORDER BY total_changes DESC
        `;

        const result = await executeQuery(query, [
            { name: 'days', value: days }
        ]);

        return result.recordset;
    }

    /**
     * Exports audit logs to CSV.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {number} [limit=10000] - Max rows
     * @returns {Promise<string>} CSV data
     */
    async exportAuditLogs(filters = {}, limit = 10000) {
        const logs = await this.getAuditLogs({
            ...filters,
            limit
        });

        if (logs.length === 0) {
            return '';
        }

        const headers = [
            'Audit ID', 'Table Name', 'Record ID', 'Action',
            'Old Values', 'New Values', 'Changed By', 'Changed By Name',
            'IP Address', 'User Agent', 'Changed At'
        ];

        const rows = logs.map(log => [
            log.audit_log_id,
            log.table_name,
            log.record_id,
            log.action,
            log.old_values || '',
            log.new_values || '',
            log.changed_by || '',
            log.changed_by_name || '',
            log.ip_address || '',
            log.user_agent || '',
            log.changed_at
        ]);

        return [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
    }
}

module.exports = new AuditRepository();