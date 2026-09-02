// src/routes/notification.routes.js
/**
 * Notification Routes
 * ====================
 * Defines REST API endpoints for notifications.
 * 
 * @module routes/notification.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/notification.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const notificationController = require('../controllers/notification.controller');

// All routes require authentication
router.use(authenticate);

// ============================================================
// User Notification Endpoints
// ============================================================

/**
 * @route GET /api/v1/notifications
 * @description Get all notifications for current user
 * @access All authenticated users
 */
router.get('/', notificationController.getUserNotifications);

/**
 * @route GET /api/v1/notifications/unread
 * @description Get unread notifications for current user
 * @access All authenticated users
 */
router.get('/unread', notificationController.getUnreadNotifications);

/**
 * @route GET /api/v1/notifications/unread-count
 * @description Get unread notification count
 * @access All authenticated users
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route GET /api/v1/notifications/statistics
 * @description Get notification statistics
 * @access All authenticated users
 */
router.get('/statistics', notificationController.getStatistics);

/**
 * @route GET /api/v1/notifications/recent
 * @description Get recent notifications
 * @access All authenticated users
 */
router.get('/recent', notificationController.getRecentNotifications);

/**
 * @route GET /api/v1/notifications/type/:type
 * @description Get notifications by type
 * @access All authenticated users
 */
router.get('/type/:type', notificationController.getNotificationsByType);

/**
 * @route PATCH /api/v1/notifications/:id/read
 * @description Mark notification as read
 * @access All authenticated users
 */
router.patch('/:id/read', notificationController.markAsRead);

/**
 * @route POST /api/v1/notifications/read-all
 * @description Mark all notifications as read
 * @access All authenticated users
 */
router.post('/read-all', notificationController.markAllAsRead);

/**
 * @route DELETE /api/v1/notifications/:id
 * @description Delete a notification
 * @access All authenticated users
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @route DELETE /api/v1/notifications
 * @description Delete all notifications
 * @access All authenticated users
 */
router.delete('/', notificationController.deleteAllNotifications);

// ============================================================
// Admin/System Notification Endpoints
// ============================================================

/**
 * @route GET /api/v1/notifications/global-statistics
 * @description Get global notification statistics
 * @access Admin only
 */
router.get(
    '/global-statistics',
    authorize('Admin'),
    notificationController.getGlobalStatistics
);

/**
 * @route POST /api/v1/notifications
 * @description Create a notification (Admin/System)
 * @access Admin only
 */
router.post(
    '/',
    authorize('Admin'),
    notificationController.createNotification
);

/**
 * @route POST /api/v1/notifications/task
 * @description Create a task notification
 * @access Admin, TTO
 */
router.post(
    '/task',
    authorize('Admin', 'TTO Officer'),
    notificationController.createTaskNotification
);

/**
 * @route POST /api/v1/notifications/renewal
 * @description Create a renewal alert
 * @access Admin, TTO
 */
router.post(
    '/renewal',
    authorize('Admin', 'TTO Officer'),
    notificationController.createRenewalAlert
);

module.exports = router;