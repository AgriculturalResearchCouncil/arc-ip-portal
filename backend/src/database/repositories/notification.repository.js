// src/database/repositories/notification.repository.js
/**
 * Notification Repository
 * =======================
 * Manages database operations for notifications.
 * 
 * Database Schema:
 * - notifications (notification_id, person_id, notification_type, 
 *   subject, message, read_at, created_at)
 * 
 * @module repositories/notification.repository
 * @requires ./base.repository
 * @requires ../index
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

        logger.info('Notification created', { notificationId, personId: data.personId, type: data.notificationType });
        return notificationId;
    }

    /**
     * Gets notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {Object} [filters] - Filter options
     * @param {boolean} [filters.isRead] - Filter by read status
     * @param {string} [filters.type] - Notification type
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Notifications
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
            WHERE person_id = @personId AND is_deleted = 0
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

        if (filters.dateFrom) {
            query += ` AND created_at >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND created_at <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
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
            WHERE person_id = @personId AND read_at IS NULL AND is_deleted = 0
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
     * Gets unread notification count for a user.
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
            WHERE person_id = @personId AND read_at IS NULL AND is_deleted = 0
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

        const result = await executeQuery(query, [
            { name: 'notificationId', type: sql.UniqueIdentifier, value: notificationId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        const affectedRows = result.rowsAffected[0] || 0;
        logger.info('Notification marked as read', { notificationId, personId });
        return affectedRows > 0;
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
            WHERE person_id = @personId AND read_at IS NULL AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        const affectedRows = result.rowsAffected[0] || 0;
        logger.info('All notifications marked as read', { personId, count: affectedRows });
        return affectedRows;
    }

    /**
     * Deletes a notification (soft delete).
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
            UPDATE notifications
            SET is_deleted = 1
            WHERE notification_id = @notificationId AND person_id = @personId
        `;

        const result = await executeQuery(query, [
            { name: 'notificationId', type: sql.UniqueIdentifier, value: notificationId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        const affectedRows = result.rowsAffected[0] || 0;
        logger.info('Notification deleted', { notificationId, personId });
        return affectedRows > 0;
    }

    /**
     * Deletes all notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<number>} Number of notifications deleted
     */
    async deleteAllNotifications(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            UPDATE notifications
            SET is_deleted = 1
            WHERE person_id = @personId
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        const affectedRows = result.rowsAffected[0] || 0;
        logger.info('All notifications deleted', { personId, count: affectedRows });
        return affectedRows;
    }

    /**
     * Gets notification statistics for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<Object>} Notification statistics
     */
    async getUserNotificationStats(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
                COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read,
                COUNT(CASE WHEN notification_type = 'WORKFLOW_TASK' AND read_at IS NULL THEN 1 END) as workflow_tasks,
                COUNT(CASE WHEN notification_type = 'RENEWAL_ALERT' AND read_at IS NULL THEN 1 END) as renewal_alerts,
                COUNT(CASE WHEN notification_type = 'OBLIGATION_REMINDER' AND read_at IS NULL THEN 1 END) as obligation_reminders,
                COUNT(CASE WHEN notification_type = 'DISCLOSURE_REVIEW' AND read_at IS NULL THEN 1 END) as disclosure_reviews,
                COUNT(CASE WHEN notification_type = 'LICENCE_APPROVAL' AND read_at IS NULL THEN 1 END) as licence_approvals,
                COUNT(CASE WHEN notification_type = 'SYSTEM_ALERT' AND read_at IS NULL THEN 1 END) as system_alerts
            FROM notifications
            WHERE person_id = @personId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset[0] || {};
    }

    /**
     * Gets global notification statistics.
     * 
     * @async
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Object>} Notification statistics
     */
    async getGlobalNotificationStats(days = 30) {
        const query = `
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(DISTINCT person_id) as users_notified,
                COUNT(CASE WHEN read_at IS NULL THEN 1 END) as unread,
                COUNT(CASE WHEN created_at >= DATEADD(day, -1, GETDATE()) THEN 1 END) as last_24h,
                COUNT(CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) THEN 1 END) as last_7d,
                COUNT(CASE WHEN notification_type = 'WORKFLOW_TASK' THEN 1 END) as workflow_notifications,
                COUNT(CASE WHEN notification_type = 'RENEWAL_ALERT' THEN 1 END) as renewal_alerts,
                COUNT(CASE WHEN notification_type = 'OBLIGATION_REMINDER' THEN 1 END) as obligation_reminders,
                COUNT(CASE WHEN notification_type = 'SYSTEM_ALERT' THEN 1 END) as system_alerts
            FROM notifications
            WHERE is_deleted = 0
            AND created_at >= DATEADD(day, -@days, GETDATE())
        `;

        const result = await executeQuery(query, [
            { name: 'days', value: days }
        ]);

        return result.recordset[0] || {};
    }

    /**
     * Gets notification by ID.
     * 
     * @async
     * @param {string} notificationId - Notification UUID
     * @param {string} personId - User UUID (for verification)
     * @returns {Promise<Object|null>} Notification object
     */
    async getNotificationById(notificationId, personId) {
        if (!notificationId || !personId) {
            throw new Error('Notification ID and person ID are required');
        }

        const query = `
            SELECT 
                notification_id,
                person_id,
                notification_type,
                subject,
                message,
                read_at,
                created_at
            FROM notifications
            WHERE notification_id = @notificationId AND person_id = @personId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'notificationId', type: sql.UniqueIdentifier, value: notificationId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Creates a workflow task notification.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} taskName - Task name
     * @param {string} dueDate - Due date
     * @param {string} [link] - Link to task
     * @param {string} [createdBy] - Creator UUID
     * @returns {Promise<string>} Notification ID
     */
    async createTaskNotification(personId, taskName, dueDate, link = null, createdBy = null) {
        const subject = 'New Task Assigned';
        const message = `You have been assigned a new task: "${taskName}". Due date: ${new Date(dueDate).toLocaleDateString()}`;
        
        return await this.createNotification({
            personId,
            notificationType: 'WORKFLOW_TASK',
            subject,
            message
        });
    }

    /**
     * Creates a renewal alert notification.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} ipTitle - IP title
     * @param {string} renewalDate - Renewal date
     * @param {string} [link] - Link to IP record
     * @param {string} [createdBy] - Creator UUID
     * @returns {Promise<string>} Notification ID
     */
    async createRenewalAlert(personId, ipTitle, renewalDate, link = null, createdBy = null) {
        const subject = 'Renewal Alert';
        const message = `IP asset "${ipTitle}" requires renewal by ${new Date(renewalDate).toLocaleDateString()}`;
        
        return await this.createNotification({
            personId,
            notificationType: 'RENEWAL_ALERT',
            subject,
            message
        });
    }

    /**
     * Creates an obligation reminder notification.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} obligationType - Obligation type
     * @param {string} dueDate - Due date
     * @param {string} [link] - Link to obligation
     * @param {string} [createdBy] - Creator UUID
     * @returns {Promise<string>} Notification ID
     */
    async createObligationReminder(personId, obligationType, dueDate, link = null, createdBy = null) {
        const subject = 'Obligation Reminder';
        const message = `Obligation "${obligationType}" is due on ${new Date(dueDate).toLocaleDateString()}`;
        
        return await this.createNotification({
            personId,
            notificationType: 'OBLIGATION_REMINDER',
            subject,
            message
        });
    }

    /**
     * Creates a disclosure review notification.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} disclosureTitle - Disclosure title
     * @param {string} [link] - Link to disclosure
     * @param {string} [createdBy] - Creator UUID
     * @returns {Promise<string>} Notification ID
     */
    async createDisclosureReviewNotification(personId, disclosureTitle, link = null, createdBy = null) {
        const subject = 'Disclosure Ready for Review';
        const message = `Disclosure "${disclosureTitle}" has been submitted and is ready for review`;
        
        return await this.createNotification({
            personId,
            notificationType: 'DISCLOSURE_REVIEW',
            subject,
            message
        });
    }

    /**
     * Creates a licence approval notification.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} licenceTitle - Licence title
     * @param {string} [link] - Link to licence
     * @param {string} [createdBy] - Creator UUID
     * @returns {Promise<string>} Notification ID
     */
    async createLicenceApprovalNotification(personId, licenceTitle, link = null, createdBy = null) {
        const subject = 'Licence Ready for Approval';
        const message = `Licence "${licenceTitle}" is pending approval`;
        
        return await this.createNotification({
            personId,
            notificationType: 'LICENCE_APPROVAL',
            subject,
            message
        });
    }

    /**
     * Creates a system alert notification.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} alertTitle - Alert title
     * @param {string} alertMessage - Alert message
     * @param {string} [createdBy] - Creator UUID
     * @returns {Promise<string>} Notification ID
     */
    async createSystemAlert(personId, alertTitle, alertMessage, createdBy = null) {
        return await this.createNotification({
            personId,
            notificationType: 'SYSTEM_ALERT',
            subject: alertTitle,
            message: alertMessage
        });
    }

    /**
     * Creates bulk notifications for multiple users.
     * 
     * @async
     * @param {Array} notifications - Array of notification data objects
     * @returns {Promise<Array>} Array of notification IDs
     */
    async createBulkNotifications(notifications) {
        if (!notifications || notifications.length === 0) {
            return [];
        }

        const notificationIds = [];

        for (const data of notifications) {
            const id = await this.createNotification(data);
            notificationIds.push(id);
        }

        logger.info('Bulk notifications created', { count: notificationIds.length });
        return notificationIds;
    }

    /**
     * Gets notifications by type for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} notificationType - Notification type
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Notifications
     */
    async getNotificationsByType(personId, notificationType, limit = null) {
        if (!personId || !notificationType) {
            throw new Error('Person ID and notification type are required');
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
            WHERE person_id = @personId AND notification_type = @notificationType AND is_deleted = 0
            ORDER BY created_at DESC
        `;

        const params = [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'notificationType', value: notificationType }
        ];

        if (limit) {
            query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
            params.push({ name: 'limit', value: limit });
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets recent notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {number} [days=7] - Days to look back
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Recent notifications
     */
    async getRecentNotifications(personId, days = 7, limit = null) {
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
            WHERE person_id = @personId AND is_deleted = 0
            AND created_at >= DATEADD(day, -@days, GETDATE())
            ORDER BY created_at DESC
        `;

        const params = [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'days', value: days }
        ];

        if (limit) {
            query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
            params.push({ name: 'limit', value: limit });
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }
}

module.exports = new NotificationRepository();