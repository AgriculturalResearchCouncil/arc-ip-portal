// src/controllers/notification.controller.js
/**
 * Notification Controller
 * =======================
 * HTTP handlers for notification endpoints.
 * 
 * @module controllers/notification.controller
 * @requires ../services/notification.service
 * @requires ../middleware/error.middleware
 */

const notificationService = require('../services/notification.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Gets notifications for the current user.
 * 
 * @route GET /api/v1/notifications
 * @access Private - All authenticated users
 */
exports.getUserNotifications = catchAsync(async (req, res) => {
    const { isRead, type, dateFrom, dateTo, page, limit } = req.query;

    const filters = {};
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    if (type) filters.type = type;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    const result = await notificationService.getUserNotifications(
        req.user.person_id,
        filters
    );

    res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
    });
});

/**
 * Gets unread notifications for the current user.
 * 
 * @route GET /api/v1/notifications/unread
 * @access Private - All authenticated users
 */
exports.getUnreadNotifications = catchAsync(async (req, res) => {
    const { limit } = req.query;

    const notifications = await notificationService.getUnreadNotifications(
        req.user.person_id,
        limit ? parseInt(limit) : 20
    );

    const unreadCount = await notificationService.getUnreadCount(req.user.person_id);

    res.json({
        success: true,
        data: notifications,
        count: notifications.length,
        unreadCount
    });
});

/**
 * Gets unread notification count.
 * 
 * @route GET /api/v1/notifications/unread-count
 * @access Private - All authenticated users
 */
exports.getUnreadCount = catchAsync(async (req, res) => {
    const count = await notificationService.getUnreadCount(req.user.person_id);

    res.json({
        success: true,
        data: { count }
    });
});

/**
 * Marks a notification as read.
 * 
 * @route PATCH /api/v1/notifications/:id/read
 * @access Private - All authenticated users
 */
exports.markAsRead = catchAsync(async (req, res) => {
    const result = await notificationService.markAsRead(
        req.params.id,
        req.user.person_id
    );

    if (!result) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found or already read'
        });
    }

    res.json({
        success: true,
        message: 'Notification marked as read'
    });
});

/**
 * Marks all notifications as read.
 * 
 * @route POST /api/v1/notifications/read-all
 * @access Private - All authenticated users
 */
exports.markAllAsRead = catchAsync(async (req, res) => {
    const count = await notificationService.markAllAsRead(req.user.person_id);

    res.json({
        success: true,
        message: `All notifications marked as read`,
        data: { count }
    });
});

/**
 * Deletes a notification.
 * 
 * @route DELETE /api/v1/notifications/:id
 * @access Private - All authenticated users
 */
exports.deleteNotification = catchAsync(async (req, res) => {
    const result = await notificationService.deleteNotification(
        req.params.id,
        req.user.person_id
    );

    if (!result) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found'
        });
    }

    res.json({
        success: true,
        message: 'Notification deleted'
    });
});

/**
 * Deletes all notifications.
 * 
 * @route DELETE /api/v1/notifications
 * @access Private - All authenticated users
 */
exports.deleteAllNotifications = catchAsync(async (req, res) => {
    const count = await notificationService.deleteAllNotifications(req.user.person_id);

    res.json({
        success: true,
        message: `All notifications deleted`,
        data: { count }
    });
});

/**
 * Gets notification statistics.
 * 
 * @route GET /api/v1/notifications/statistics
 * @access Private - All authenticated users
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const userStats = await notificationService.getUserNotificationStats(req.user.person_id);

    res.json({
        success: true,
        data: userStats
    });
});

/**
 * Gets global notification statistics.
 * 
 * @route GET /api/v1/notifications/global-statistics
 * @access Private - Admin only
 */
exports.getGlobalStatistics = catchAsync(async (req, res) => {
    const { days } = req.query;

    const stats = await notificationService.getGlobalNotificationStats(
        days ? parseInt(days) : 30
    );

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Gets notifications by type.
 * 
 * @route GET /api/v1/notifications/type/:type
 * @access Private - All authenticated users
 */
exports.getNotificationsByType = catchAsync(async (req, res) => {
    const { type } = req.params;
    const { limit } = req.query;

    const notifications = await notificationService.getNotificationsByType(
        req.user.person_id,
        type,
        limit ? parseInt(limit) : null
    );

    res.json({
        success: true,
        data: notifications,
        count: notifications.length
    });
});

/**
 * Gets recent notifications.
 * 
 * @route GET /api/v1/notifications/recent
 * @access Private - All authenticated users
 */
exports.getRecentNotifications = catchAsync(async (req, res) => {
    const { days, limit } = req.query;

    const notifications = await notificationService.getRecentNotifications(
        req.user.person_id,
        days ? parseInt(days) : 7,
        limit ? parseInt(limit) : null
    );

    res.json({
        success: true,
        data: notifications,
        count: notifications.length
    });
});

/**
 * Creates a notification (Admin/System use only).
 * 
 * @route POST /api/v1/notifications
 * @access Private - Admin only
 */
exports.createNotification = catchAsync(async (req, res) => {
    const { personId, notificationType, subject, message } = req.body;

    if (!personId || !notificationType || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'Person ID, notification type, subject, and message are required'
        });
    }

    const notificationId = await notificationService.createNotification({
        personId,
        notificationType,
        subject,
        message
    });

    res.status(201).json({
        success: true,
        data: { notificationId },
        message: 'Notification created successfully'
    });
});

/**
 * Creates a workflow task notification.
 * 
 * @route POST /api/v1/notifications/task
 * @access Private - Admin, TTO
 */
exports.createTaskNotification = catchAsync(async (req, res) => {
    const { personId, taskName, dueDate, link } = req.body;

    if (!personId || !taskName || !dueDate) {
        return res.status(400).json({
            success: false,
            message: 'Person ID, task name, and due date are required'
        });
    }

    const notificationId = await notificationService.createTaskNotification(
        personId,
        taskName,
        dueDate,
        link,
        req.user.person_id
    );

    res.status(201).json({
        success: true,
        data: { notificationId },
        message: 'Task notification created'
    });
});

/**
 * Creates a renewal alert notification.
 * 
 * @route POST /api/v1/notifications/renewal
 * @access Private - Admin, TTO
 */
exports.createRenewalAlert = catchAsync(async (req, res) => {
    const { personId, ipTitle, renewalDate, link } = req.body;

    if (!personId || !ipTitle || !renewalDate) {
        return res.status(400).json({
            success: false,
            message: 'Person ID, IP title, and renewal date are required'
        });
    }

    const notificationId = await notificationService.createRenewalAlert(
        personId,
        ipTitle,
        renewalDate,
        link,
        req.user.person_id
    );

    res.status(201).json({
        success: true,
        data: { notificationId },
        message: 'Renewal alert created'
    });
});