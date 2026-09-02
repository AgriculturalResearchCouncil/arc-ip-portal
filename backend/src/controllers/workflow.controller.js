// src/controllers/workflow.controller.js
/**
 * Workflow Controller
 * ===================
 * HTTP handlers for workflow management endpoints.
 * 
 * @module controllers/workflow.controller
 * @requires ../services/workflow.service
 * @requires ../middleware/error.middleware
 */

const workflowService = require('../services/workflow.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates workflow tasks for a record.
 * 
 * @route POST /api/v1/workflows/tasks
 * @access Private - TTO Officer, Admin
 */
exports.createTasks = catchAsync(async (req, res) => {
    const { ipRecordId, recordType, assignedTo, dueDate } = req.body;

    if (!ipRecordId || !recordType) {
        return res.status(400).json({
            success: false,
            message: 'IP Record ID and record type are required'
        });
    }

    const taskIds = await workflowService.createWorkflowTasks(
        ipRecordId,
        recordType,
        req.user.person_id,
        assignedTo || null,
        dueDate || null
    );

    res.status(201).json({
        success: true,
        data: { taskIds },
        message: `Created ${taskIds.length} workflow tasks`
    });
});

/**
 * Gets tasks by IP record.
 * 
 * @route GET /api/v1/workflows/tasks/ip-record/:ipRecordId
 * @access Private - TTO Officer, Admin
 */
exports.getTasksByIpRecord = catchAsync(async (req, res) => {
    const tasks = await workflowService.getTasksByIpRecord(req.params.ipRecordId);

    res.json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

/**
 * Gets a task by ID.
 * 
 * @route GET /api/v1/workflows/tasks/:taskId
 * @access Private - TTO Officer, Admin
 */
exports.getTaskById = catchAsync(async (req, res) => {
    const task = await workflowService.getTaskById(req.params.taskId);

    if (!task) {
        return res.status(404).json({
            success: false,
            message: 'Task not found'
        });
    }

    res.json({
        success: true,
        data: task
    });
});

/**
 * Gets pending tasks for current user.
 * 
 * @route GET /api/v1/workflows/tasks/pending
 * @access Private - All authenticated users
 */
exports.getPendingTasks = catchAsync(async (req, res) => {
    const tasks = await workflowService.getPendingTasks(req.user.person_id);

    res.json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

/**
 * Gets user tasks by status.
 * 
 * @route GET /api/v1/workflows/tasks/user/:userId
 * @access Private - TTO Officer, Admin
 */
exports.getUserTasks = catchAsync(async (req, res) => {
    const { status } = req.query;
    const tasks = await workflowService.getUserTasks(req.params.userId, status);

    res.json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

/**
 * Gets overdue tasks.
 * 
 * @route GET /api/v1/workflows/tasks/overdue
 * @access Private - TTO Officer, Admin
 */
exports.getOverdueTasks = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 0;
    const tasks = await workflowService.getOverdueTasks(days);

    res.json({
        success: true,
        data: tasks,
        count: tasks.length,
        daysThreshold: days
    });
});

/**
 * Gets tasks by status.
 * 
 * @route GET /api/v1/workflows/tasks/status/:status
 * @access Private - TTO Officer, Admin
 */
exports.getTasksByStatus = catchAsync(async (req, res) => {
    const tasks = await workflowService.getTasksByStatus(req.params.status);

    res.json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

/**
 * Gets tasks by priority.
 * 
 * @route GET /api/v1/workflows/tasks/priority/:priority
 * @access Private - TTO Officer, Admin
 */
exports.getTasksByPriority = catchAsync(async (req, res) => {
    const tasks = await workflowService.getTasksByPriority(req.params.priority);

    res.json({
        success: true,
        data: tasks,
        count: tasks.length
    });
});

/**
 * Updates task status.
 * 
 * @route PATCH /api/v1/workflows/tasks/:taskId/status
 * @access Private - TTO Officer, Admin
 */
exports.updateTaskStatus = catchAsync(async (req, res) => {
    const { status, comments } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const task = await workflowService.updateTaskStatus(
        req.params.taskId,
        status,
        req.user.person_id,
        { comments }
    );

    res.json({
        success: true,
        data: task,
        message: `Task status updated to ${status}`
    });
});

/**
 * Assigns a task to a user.
 * 
 * @route POST /api/v1/workflows/tasks/:taskId/assign
 * @access Private - TTO Officer, Admin
 */
exports.assignTask = catchAsync(async (req, res) => {
    const { assignedTo } = req.body;

    if (!assignedTo) {
        return res.status(400).json({
            success: false,
            message: 'Assigned user is required'
        });
    }

    const task = await workflowService.assignTask(
        req.params.taskId,
        assignedTo,
        req.user.person_id
    );

    res.json({
        success: true,
        data: task,
        message: 'Task assigned successfully'
    });
});

/**
 * Completes a task.
 * 
 * @route POST /api/v1/workflows/tasks/:taskId/complete
 * @access Private - TTO Officer, Admin
 */
exports.completeTask = catchAsync(async (req, res) => {
    const { comments } = req.body;

    const task = await workflowService.completeTask(
        req.params.taskId,
        req.user.person_id,
        comments
    );

    res.json({
        success: true,
        data: task,
        message: 'Task completed successfully'
    });
});

/**
 * Gets user task counts.
 * 
 * @route GET /api/v1/workflows/tasks/counts/:userId
 * @access Private - TTO Officer, Admin
 */
exports.getUserTaskCounts = catchAsync(async (req, res) => {
    const counts = await workflowService.getUserTaskCounts(req.params.userId);

    res.json({
        success: true,
        data: counts
    });
});

/**
 * Gets workflow statistics.
 * 
 * @route GET /api/v1/workflows/statistics
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await workflowService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Gets workflow template.
 * 
 * @route GET /api/v1/workflows/template/:recordType
 * @access Private - TTO Officer, Admin
 */
exports.getWorkflowTemplate = catchAsync(async (req, res) => {
    const template = await workflowService.getWorkflowTemplate(req.params.recordType);

    res.json({
        success: true,
        data: template,
        count: template.length
    });
});

/**
 * Deletes a task.
 * 
 * @route DELETE /api/v1/workflows/tasks/:taskId
 * @access Private - TTO Officer, Admin
 */
exports.deleteTask = catchAsync(async (req, res) => {
    await workflowService.deleteTask(req.params.taskId, req.user.person_id);

    res.json({
        success: true,
        message: 'Task deleted successfully'
    });
});