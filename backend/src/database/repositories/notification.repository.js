// src/database/repositories/notification.repository.js
/**
 * Notification Repository
 * =======================
 * Manages database operations for notifications table.
 * 
 * Database Schema (notifications):
 * - notification_id (uniqueidentifier, PK)
 * - person_id (uniqueidentifier, FK to persons)
 * - notification_type (nvarchar, required)
 * - subject (nvarchar, required)
 * - message (nvarchar, required)
 * - read_at (datetime2, nullable)
 * - created_at (datetime2, nullable)
 * 
 * @module repositories/notification.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

class NotificationRepository extends BaseRepository {
    constructor() {
        super('notifications', 'notification_id');
    }

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

        return true;
    }

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

        return true;
    }

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

        return true;
    }
}

module.exports = new NotificationRepository();