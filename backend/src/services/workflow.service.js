/**
 * Workflow Service
 * ================
 * Business logic layer for workflow management.
 * 
 * @module services/workflow.service
 * @requires ../database/repositories/workflow.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../database/repositories/person.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const workflowRepository = require('../database/repositories/workflow.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');

/**
 * WorkflowService class containing all workflow business logic.
 * 
 * @class WorkflowService
 */
class WorkflowService {
    /**
     * Creates workflow tasks for a record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} recordType - Record type ('disclosure', 'licence', 'evaluation')
     * @param {string} createdBy - User UUID
     * @param {string} [assignedTo] - User to assign tasks to
     * @param {string} [dueDate] - Due date for tasks
     * @returns {Promise<Array>} Created task IDs
     */
    async createWorkflowTasks(ipRecordId, recordType, createdBy, assignedTo = null, dueDate = null) {
        try {
            // Verify IP record exists
            const ipRecord = await ipRecordRepository.findById(ipRecordId);
            if (!ipRecord) {
                throw new NotFoundError('IP record not found', { ipRecordId });
            }

            // Get workflow template
            const template = await workflowRepository.getWorkflowDefinitionsByType(recordType);
            if (!template || template.length === 0) {
                throw new NotFoundError('No workflow template found for record type', { recordType });
            }

            // Create tasks
            const taskIds = await workflowRepository.createTasksFromDefinitions(
                ipRecordId,
                recordType,
                assignedTo || createdBy,
                dueDate || null
            );

            logger.logAudit('WORKFLOW_TASKS_CREATED', createdBy, {
                ipRecordId,
                recordType,
                taskCount: taskIds.length
            });

            return taskIds;
        } catch (error) {
            logger.error('Error creating workflow tasks:', error);
            throw error;
        }
    }

    /**
     * Gets tasks for an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of tasks
     */
    async getTasksByIpRecord(ipRecordId) {
        return await workflowRepository.getTasksByIpRecord(ipRecordId);
    }

    /**
     * Gets a task by ID.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @returns {Promise<Object|null>} Task object
     */
    async getTaskById(taskId) {
        return await workflowRepository.getTaskById(taskId);
    }

    /**
     * Gets pending tasks for a user.
     * 
     * @async
     * @param {string} userId - User UUID
     * @returns {Promise<Array>} Array of pending tasks
     */
    async getPendingTasks(userId) {
        return await workflowRepository.getPendingTasksByUser(userId);
    }

    /**
     * Gets user tasks by status.
     * 
     * @async
     * @param {string} userId - User UUID
     * @param {string} [status] - Optional status filter
     * @returns {Promise<Array>} Array of tasks
     */
    async getUserTasks(userId, status = null) {
        if (status) {
            // If status filter provided, get tasks by status from repository
            const allTasks = await workflowRepository.getTasksByIpRecord(userId);
            return allTasks.filter(task => task.task_status === status);
        }
        return await workflowRepository.getPendingTasksByUser(userId);
    }

    /**
     * Gets overdue tasks.
     * 
     * @async
     * @param {number} [daysThreshold=0] - Days threshold
     * @returns {Promise<Array>} Array of overdue tasks
     */
    async getOverdueTasks(daysThreshold = 0) {
        return await workflowRepository.getOverdueTasks(daysThreshold);
    }

    /**
     * Updates task status.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated task
     */
    async updateTaskStatus(taskId, status, updatedBy, metadata = null) {
        const task = await workflowRepository.getTaskById(taskId);
        if (!task) {
            throw new NotFoundError('Task not found', { taskId });
        }

        const validStatuses = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'Overdue'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid task status', {
                status,
                validStatuses
            });
        }

        const updated = await workflowRepository.updateTaskStatus(taskId, status, updatedBy, metadata);

        logger.logAudit('TASK_STATUS_UPDATED', updatedBy, {
            taskId,
            oldStatus: task.task_status,
            newStatus: status
        });

        return updated;
    }

    /**
     * Assigns a task to a user.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} assignedTo - User UUID
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated task
     */
    async assignTask(taskId, assignedTo, updatedBy) {
        const task = await workflowRepository.getTaskById(taskId);
        if (!task) {
            throw new NotFoundError('Task not found', { taskId });
        }

        // Verify user exists
        const user = await personRepository.findById(assignedTo);
        if (!user) {
            throw new NotFoundError('User not found', { assignedTo });
        }

        // Update assignment
        const updated = await workflowRepository.updateTaskAssignment(taskId, assignedTo, updatedBy);

        logger.logAudit('TASK_ASSIGNED', updatedBy, {
            taskId,
            assignedTo
        });

        return updated;
    }

    /**
     * Completes a task.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} updatedBy - User UUID
     * @param {string} [comments] - Completion comments
     * @returns {Promise<Object>} Completed task
     */
    async completeTask(taskId, updatedBy, comments = null) {
        const task = await workflowRepository.getTaskById(taskId);
        if (!task) {
            throw new NotFoundError('Task not found', { taskId });
        }

        if (task.task_status === 'Completed') {
            throw new ValidationError('Task is already completed', { taskId });
        }

        const metadata = comments ? { comments } : null;
        const updated = await workflowRepository.updateTaskStatus(
            taskId,
            'Completed',
            updatedBy,
            metadata
        );

        logger.logAudit('TASK_COMPLETED', updatedBy, {
            taskId,
            comments
        });

        return updated;
    }

    /**
     * Gets task counts for a user.
     * 
     * @async
     * @param {string} userId - User UUID
     * @returns {Promise<Object>} Task counts
     */
    async getUserTaskCounts(userId) {
        return await workflowRepository.getUserTaskCounts(userId);
    }

    /**
     * Gets workflow statistics.
     * 
     * @async
     * @returns {Promise<Object>} Workflow statistics
     */
    async getStatistics() {
        return await workflowRepository.getStatistics();
    }

    /**
     * Gets workflow template for a record type.
     * 
     * @async
     * @param {string} recordType - Record type
     * @returns {Promise<Array>} Workflow template
     */
    async getWorkflowTemplate(recordType) {
        return await workflowRepository.getWorkflowDefinitionsByType(recordType);
    }

    /**
     * Deletes a task.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} updatedBy - User UUID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteTask(taskId, updatedBy) {
        const task = await workflowRepository.getTaskById(taskId);
        if (!task) {
            throw new NotFoundError('Task not found', { taskId });
        }

        if (task.task_status === 'Completed') {
            throw new ForbiddenError('Cannot delete a completed task', { taskId });
        }

        const result = await workflowRepository.deleteTask(taskId, updatedBy);

        logger.logAudit('TASK_DELETED', updatedBy, { taskId });

        return result;
    }
}

module.exports = new WorkflowService();