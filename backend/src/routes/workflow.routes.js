// src/routes/workflow.routes.js
/**
 * Workflow Routes
 * ===============
 * Defines REST API endpoints for workflow management.
 * 
 * @module routes/workflow.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/workflow.controller
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const workflowController = require('../controllers/workflow.controller');

// All routes require authentication
router.use(authenticate);

// ============================================================
// Workflow Task Management
// ============================================================

/**
 * @route POST /api/v1/workflows/tasks
 * @description Create workflow tasks for a record
 * @access TTO Officer, Admin
 */
router.post(
    '/tasks',
    authorize('TTO Officer', 'Admin'),
    workflowController.createTasks
);

/**
 * @route GET /api/v1/workflows/tasks/pending
 * @description Get pending tasks for current user
 * @access All authenticated users
 */
router.get(
    '/tasks/pending',
    workflowController.getPendingTasks
);

/**
 * @route GET /api/v1/workflows/tasks/overdue
 * @description Get overdue tasks
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/overdue',
    authorize('TTO Officer', 'Admin'),
    workflowController.getOverdueTasks
);

/**
 * @route GET /api/v1/workflows/tasks/status/:status
 * @description Get tasks by status
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/status/:status',
    authorize('TTO Officer', 'Admin'),
    workflowController.getTasksByStatus
);

/**
 * @route GET /api/v1/workflows/tasks/priority/:priority
 * @description Get tasks by priority
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/priority/:priority',
    authorize('TTO Officer', 'Admin'),
    workflowController.getTasksByPriority
);

/**
 * @route GET /api/v1/workflows/tasks/user/:userId
 * @description Get user tasks by status
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/user/:userId',
    authorize('TTO Officer', 'Admin'),
    workflowController.getUserTasks
);

/**
 * @route GET /api/v1/workflows/tasks/counts/:userId
 * @description Get user task counts
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/counts/:userId',
    authorize('TTO Officer', 'Admin'),
    workflowController.getUserTaskCounts
);

/**
 * @route GET /api/v1/workflows/tasks/ip-record/:ipRecordId
 * @description Get tasks by IP record
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/ip-record/:ipRecordId',
    authorize('TTO Officer', 'Admin'),
    workflowController.getTasksByIpRecord
);

/**
 * @route GET /api/v1/workflows/tasks/:taskId
 * @description Get task by ID
 * @access TTO Officer, Admin
 */
router.get(
    '/tasks/:taskId',
    authorize('TTO Officer', 'Admin'),
    workflowController.getTaskById
);

/**
 * @route PATCH /api/v1/workflows/tasks/:taskId/status
 * @description Update task status
 * @access TTO Officer, Admin
 */
router.patch(
    '/tasks/:taskId/status',
    authorize('TTO Officer', 'Admin'),
    workflowController.updateTaskStatus
);

/**
 * @route POST /api/v1/workflows/tasks/:taskId/assign
 * @description Assign task to a user
 * @access TTO Officer, Admin
 */
router.post(
    '/tasks/:taskId/assign',
    authorize('TTO Officer', 'Admin'),
    workflowController.assignTask
);

/**
 * @route POST /api/v1/workflows/tasks/:taskId/complete
 * @description Complete a task
 * @access TTO Officer, Admin
 */
router.post(
    '/tasks/:taskId/complete',
    authorize('TTO Officer', 'Admin'),
    workflowController.completeTask
);

/**
 * @route DELETE /api/v1/workflows/tasks/:taskId
 * @description Delete a task
 * @access TTO Officer, Admin
 */
router.delete(
    '/tasks/:taskId',
    authorize('TTO Officer', 'Admin'),
    workflowController.deleteTask
);

// ============================================================
// Workflow Management
// ============================================================

/**
 * @route GET /api/v1/workflows/statistics
 * @description Get workflow statistics
 * @access TTO Officer, Admin, Executive
 */
router.get(
    '/statistics',
    authorize('TTO Officer', 'Admin', 'Executive'),
    workflowController.getStatistics
);

/**
 * @route GET /api/v1/workflows/template/:recordType
 * @description Get workflow template
 * @access TTO Officer, Admin
 */
router.get(
    '/template/:recordType',
    authorize('TTO Officer', 'Admin'),
    workflowController.getWorkflowTemplate
);

module.exports = router;