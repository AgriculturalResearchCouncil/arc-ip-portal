/**
 * Notification Repository
 * =======================
 * Manages database operations for notifications table.
 * 
 * Database Schema (notifications):
 * - notification_id (uniqueidentifier, PK)
 * - person_id (uniqueidentifier, FK to persons)
 * - notification_type (nvarchar, required) - 'WORKFLOW_TASK', 'RENEWAL_ALERT', 'OBLIGATION_REMINDER', 'DISCLOSURE_REVIEW', 'LICENCE_APPROVAL', 'SYSTEM_ALERT'
 * - subject (nvarchar, required)
 * - message (nvarchar, required)
 * - read_at (datetime2, nullable) - NULL = unread, NOT NULL = read
 * - created_at (datetime2, nullable)
 * 
 * Note: There is NO 'is_deleted' column in this table.
 * 
 * @module repositories/notification.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * NotificationRepository class for managing notifications.
 * 
 * @class NotificationRepository
 * @extends BaseRepository
 */
class NotificationRepository extends BaseRepository {
    constructor() {
        super('notifications', 'notification_id');
    }

    /**
     * Creates a notification.
     * 
     * @async
     * @param {Object} data - Notification data
     * @param {string} data.personId - User UUID (required)
     * @param {string} data.notificationType - Type of notification (required)
     * @param {string} data.subject - Notification subject (required)
     * @param {string} data.message - Notification message (required)
     * @returns {Promise<string>} Notification ID
     */
    async createNotification(data) {
        if (!data.personId || !data.notificationType || !data.subject || !data.message) {
            throw new Error('Person ID, notification type, subject, and message are required');
        }

        const notificationId = this.generateId();
        const query = `
            INSERT INTO notifications (
                notification_id,
                person_id,
                notification_type,
                subject,
                message,
                created_at
            ) VALUES (
                @notificationId,
                @personId,
                @notificationType,
                @subject,
                @message,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'notificationId', type: sql.UniqueIdentifier, value: notificationId },
            { name: 'personId', type: sql.UniqueIdentifier, value: data.personId },
            { name: 'notificationType', value: data.notificationType },
            { name: 'subject', value: data.subject },
            { name: 'message', value: data.message }
        ]);

        logger.info('Notification created', { notificationId, personId: data.personId });
        return notificationId;
    }

    /**
     * Gets notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {Object} [filters={}] - Filter options
     * @param {boolean} [filters.isRead] - Filter by read status
     * @param {string} [filters.type] - Notification type
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of notifications
     */
    async getUserNotifications(personId, filters = {}) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        let query = `
            SELECT 
                notification_id,
                person_id,
                notification_type,
                subject,
                message,
                read_at,
                created_at,
                CASE WHEN read_at IS NULL THEN 1 ELSE 0 END as is_unread
            FROM notifications
            WHERE person_id = @personId
        `;

        const params = [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ];

        if (filters.isRead !== undefined) {
            if (filters.isRead) {
                query += ` AND read_at IS NOT NULL`;
            } else {
                query += ` AND read_at IS NULL`;
            }
        }

        if (filters.type) {
            query += ` AND notification_type = @type`;
            params.push({ name: 'type', value: filters.type });
        }

        query += ` ORDER BY created_at DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets unread notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Unread notifications
     */
    async getUnreadNotifications(personId, limit = null) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        let query = `
            SELECT 
                notification_id,
                person_id,
                notification_type,
                subject,
                message,
                read_at,
                created_at
            FROM notifications
            WHERE person_id = @personId AND read_at IS NULL
            ORDER BY created_at DESC
        `;

        const params = [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ];

        if (limit) {
            query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
            params.push({ name: 'limit', value: limit });
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets unread notification count.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<number>} Unread count
     */
    async getUnreadCount(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT COUNT(*) as count
            FROM notifications
            WHERE person_id = @personId AND read_at IS NULL
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset[0]?.count || 0;
    }

    /**
     * Marks a notification as read.
     * 
     * @async
     * @param {string} notificationId - Notification UUID
     * @param {string} personId - User UUID (for verification)
     * @returns {Promise<boolean>} True if successful
     */
    async markAsRead(notificationId, personId) {
        if (!notificationId || !personId) {
            throw new Error('Notification ID and person ID are required');
        }

        const query = `
            UPDATE notifications
            SET read_at = GETDATE()
            WHERE notification_id = @notificationId AND person_id = @personId
        `;

        await executeQuery(query, [
            { name: 'notificationId', type: sql.UniqueIdentifier, value: notificationId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        logger.info('Notification marked as read', { notificationId, personId });
        return true;
    }

    /**
     * Marks all notifications as read for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<number>} Number of notifications marked as read
     */
    async markAllAsRead(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            UPDATE notifications
            SET read_at = GETDATE()
            WHERE person_id = @personId AND read_at IS NULL
        `;

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        const affectedRows = result?.rowsAffected?.[0] || 0;
        logger.info('All notifications marked as read', { personId, count: affectedRows });
        return affectedRows;
    }

    /**
     * Deletes a notification.
     * 
     * @async
     * @param {string} notificationId - Notification UUID
     * @param {string} personId - User UUID (for verification)
     * @returns {Promise<boolean>} True if successful
     */
    async deleteNotification(notificationId, personId) {
        if (!notificationId || !personId) {
            throw new Error('Notification ID and person ID are required');
        }

        const query = `
            DELETE FROM notifications
            WHERE notification_id = @notificationId AND person_id = @personId
        `;

        await executeQuery(query, [
            { name: 'notificationId', type: sql.UniqueIdentifier, value: notificationId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        logger.info('Notification deleted', { notificationId, personId });
        return true;
    }
}

module.exports = new NotificationRepository();