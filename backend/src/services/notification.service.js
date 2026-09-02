// src/services/notification.service.js
/**
 * Notification Service
 * ====================
 * Business logic layer for notifications.
 * 
 * @module services/notification.service
 * @requires ../database/repositories/notification.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const notificationRepository = require('../database/repositories/notification.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');

/**
 * NotificationService class containing all notification business logic.
 * 
 * @class NotificationService
 */
class NotificationService {
    /**
     * Creates a notification.
     * 
     * @async
     * @param {Object} data - Notification data
     * @param {string} data.personId - User UUID
     * @param {string} data.notificationType - Notification type
     * @param {string} data.subject - Notification subject
     * @param {string} data.message - Notification message
     * @returns {Promise<string>} Notification ID
     */
    async createNotification(data) {
        try {
            return await notificationRepository.createNotification(data);
        } catch (error) {
            logger.error('Error creating notification:', error);
            throw error;
        }
    }

    /**
     * Gets notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {Object} [filters] - Filter options
     * @param {number} [filters.page] - Page number
     * @param {number} [filters.limit] - Items per page
     * @returns {Promise<Object>} Notifications with pagination
     */
    async getUserNotifications(personId, filters = {}) {
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const offset = (page - 1) * limit;

        const notifications = await notificationRepository.getUserNotifications(personId, {
            ...filters,
            limit,
            offset
        });

        const unreadCount = await notificationRepository.getUnreadCount(personId);

        return {
            data: notifications,
            pagination: {
                page,
                limit,
                total: notifications.length + (offset),
                unread: unreadCount
            }
        };
    }

    /**
     * Gets unread notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Unread notifications
     */
    async getUnreadNotifications(personId, limit = 20) {
        return await notificationRepository.getUnreadNotifications(personId, limit);
    }

    /**
     * Gets unread notification count for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<number>} Unread count
     */
    async getUnreadCount(personId) {
        return await notificationRepository.getUnreadCount(personId);
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
        const notification = await notificationRepository.getNotificationById(notificationId, personId);
        if (!notification) {
            throw new NotFoundError('Notification not found', { notificationId });
        }

        return await notificationRepository.markAsRead(notificationId, personId);
    }

    /**
     * Marks all notifications as read for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<number>} Number of notifications marked as read
     */
    async markAllAsRead(personId) {
        return await notificationRepository.markAllAsRead(personId);
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
        const notification = await notificationRepository.getNotificationById(notificationId, personId);
        if (!notification) {
            throw new NotFoundError('Notification not found', { notificationId });
        }

        return await notificationRepository.deleteNotification(notificationId, personId);
    }

    /**
     * Deletes all notifications for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<number>} Number of notifications deleted
     */
    async deleteAllNotifications(personId) {
        return await notificationRepository.deleteAllNotifications(personId);
    }

    /**
     * Gets notification statistics for a user.
     * 
     * @async
     * @param {string} personId - User UUID
     * @returns {Promise<Object>} Notification statistics
     */
    async getUserNotificationStats(personId) {
        return await notificationRepository.getUserNotificationStats(personId);
    }

    /**
     * Gets global notification statistics.
     * 
     * @async
     * @param {number} [days=30] - Days to look back
     * @returns {Promise<Object>} Notification statistics
     */
    async getGlobalNotificationStats(days = 30) {
        return await notificationRepository.getGlobalNotificationStats(days);
    }

    /**
     * Gets notifications by type.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {string} notificationType - Notification type
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Notifications
     */
    async getNotificationsByType(personId, notificationType, limit = null) {
        return await notificationRepository.getNotificationsByType(personId, notificationType, limit);
    }

    /**
     * Gets recent notifications.
     * 
     * @async
     * @param {string} personId - User UUID
     * @param {number} [days=7] - Days to look back
     * @param {number} [limit] - Max results
     * @returns {Promise<Array>} Recent notifications
     */
    async getRecentNotifications(personId, days = 7, limit = null) {
        return await notificationRepository.getRecentNotifications(personId, days, limit);
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
        return await notificationRepository.createTaskNotification(personId, taskName, dueDate, link, createdBy);
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
        return await notificationRepository.createRenewalAlert(personId, ipTitle, renewalDate, link, createdBy);
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
        return await notificationRepository.createObligationReminder(personId, obligationType, dueDate, link, createdBy);
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
        return await notificationRepository.createDisclosureReviewNotification(
            personId,
            disclosureTitle,
            link,
            createdBy
        );
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
        return await notificationRepository.createLicenceApprovalNotification(
            personId,
            licenceTitle,
            link,
            createdBy
        );
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
        return await notificationRepository.createSystemAlert(personId, alertTitle, alertMessage, createdBy);
    }

    /**
     * Creates bulk notifications.
     * 
     * @async
     * @param {Array} notifications - Array of notification data objects
     * @returns {Promise<Array>} Array of notification IDs
     */
    async createBulkNotifications(notifications) {
        return await notificationRepository.createBulkNotifications(notifications);
    }

    /**
     * Gets a notification by ID.
     * 
     * @async
     * @param {string} notificationId - Notification UUID
     * @param {string} personId - User UUID (for verification)
     * @returns {Promise<Object|null>} Notification object
     */
    async getNotificationById(notificationId, personId) {
        return await notificationRepository.getNotificationById(notificationId, personId);
    }
}

module.exports = new NotificationService();