// src/database/repositories/workflow.repository.js
/**
 * Workflow Engine Repository
 * ==========================
 * Manages database operations for workflows.
 * Handles:
 * - Workflow definitions
 * - Workflow tasks
 * - Task assignments
 * - Task status tracking
 * 
 * Database Schema:
 * - workflow_definitions (workflow_definition_id, workflow_name, record_type, 
 *   sequence_no, task_name, assigned_role, mandatory, description, created_at, updated_at)
 * - workflow_tasks (workflow_task_id, ip_record_id, task_name, task_type,
 *   assigned_to, due_date, completed_date, task_status, priority, comments, created_at, updated_at)
 * 
 * @module repositories/workflow.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * WorkflowRepository class for managing workflows.
 * 
 * @class WorkflowRepository
 * @extends BaseRepository
 */
class WorkflowRepository extends BaseRepository {
    constructor() {
        super('workflow_definitions', 'workflow_definition_id');
    }

    /**
     * Gets workflow definitions by record type.
     * 
     * @async
     * @param {string} recordType - Type of record ('disclosure', 'licence', 'evaluation')
     * @returns {Promise<Array>} Array of workflow definitions
     */
    async getWorkflowDefinitionsByType(recordType) {
        if (!recordType) {
            throw new Error('Record type is required');
        }

        const query = `
            SELECT * FROM workflow_definitions
            WHERE record_type = @recordType
            ORDER BY sequence_no ASC
        `;

        const result = await executeQuery(query, [
            { name: 'recordType', value: recordType }
        ]);

        return result.recordset;
    }

    /**
     * Creates a workflow task.
     * 
     * @async
     * @param {Object} data - Task data
     * @param {string} data.ip_record_id - IP record UUID
     * @param {string} data.task_name - Task name (required)
     * @param {string} [data.task_type] - Task type
     * @param {string} [data.assigned_to] - Assigned user UUID
     * @param {string} [data.due_date] - Due date
     * @param {string} [data.priority] - Priority
     * @param {string} [data.comments] - Comments
     * @returns {Promise<Object>} Created task
     */
    async createTask(data) {
        if (!data.ip_record_id || !data.task_name) {
            throw new Error('IP Record ID and Task Name are required');
        }

        const taskId = this.generateId();
        const query = `
            INSERT INTO workflow_tasks (
                workflow_task_id,
                ip_record_id,
                task_name,
                task_type,
                assigned_to,
                due_date,
                priority,
                comments,
                task_status,
                created_at
            ) VALUES (
                @taskId,
                @ipRecordId,
                @taskName,
                @taskType,
                @assignedTo,
                @dueDate,
                @priority,
                @comments,
                'Pending',
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'taskId', type: sql.UniqueIdentifier, value: taskId },
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: data.ip_record_id },
            { name: 'taskName', value: data.task_name },
            { name: 'taskType', value: data.task_type || null },
            { name: 'assignedTo', type: sql.UniqueIdentifier, value: data.assigned_to || null },
            { name: 'dueDate', value: data.due_date || null },
            { name: 'priority', value: data.priority || 'Normal' },
            { name: 'comments', value: data.comments || null }
        ]);

        logger.info('Workflow task created', { taskId, ipRecordId: data.ip_record_id, taskName: data.task_name });
        return this.getTaskById(taskId);
    }

    /**
     * Creates workflow tasks from workflow definitions.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} recordType - Record type
     * @param {string} [assignedTo] - User to assign tasks to
     * @param {string} [dueDate] - Due date for tasks
     * @returns {Promise<Array>} Array of created task IDs
     */
    async createTasksFromDefinitions(ipRecordId, recordType, assignedTo = null, dueDate = null) {
        if (!ipRecordId || !recordType) {
            throw new Error('IP Record ID and record type are required');
        }

        const definitions = await this.getWorkflowDefinitionsByType(recordType);
        const taskIds = [];

        for (const def of definitions) {
            const taskData = {
                ip_record_id: ipRecordId,
                task_name: def.task_name,
                task_type: def.task_type || null,
                assigned_to: assignedTo || null,
                due_date: dueDate || null,
                priority: def.priority || 'Normal',
                comments: def.description || null
            };

            const task = await this.createTask(taskData);
            taskIds.push(task.workflow_task_id);
        }

        logger.info('Workflow tasks created from definitions', { 
            ipRecordId, 
            recordType, 
            taskCount: taskIds.length 
        });

        return taskIds;
    }

    /**
     * Gets a task by ID.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @returns {Promise<Object|null>} Task object
     */
    async getTaskById(taskId) {
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        const query = `
            SELECT 
                wt.*,
                p.first_name + ' ' + p.last_name as assigned_to_name,
                p.email as assigned_to_email,
                ir.reference_number as ip_reference
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            LEFT JOIN ip_records ir ON wt.ip_record_id = ir.ip_record_id
            WHERE wt.workflow_task_id = @taskId AND wt.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'taskId', type: sql.UniqueIdentifier, value: taskId }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets tasks by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of tasks
     */
    async getTasksByIpRecord(ipRecordId) {
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                wt.*,
                p.first_name + ' ' + p.last_name as assigned_to_name,
                p.email as assigned_to_email
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            WHERE wt.ip_record_id = @ipRecordId AND wt.is_deleted = 0
            ORDER BY wt.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
    }

    /**
     * Gets pending tasks for a user.
     * 
     * @async
     * @param {string} userId - User UUID
     * @returns {Promise<Array>} Array of pending tasks
     */
    async getPendingTasksByUser(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const query = `
            SELECT 
                wt.*,
                p.first_name + ' ' + p.last_name as assigned_to_name,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                DATEDIFF(day, wt.due_date, GETDATE()) as days_overdue
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            LEFT JOIN ip_records ir ON wt.ip_record_id = ir.ip_record_id
            WHERE wt.assigned_to = @userId
            AND wt.task_status = 'Pending'
            AND wt.is_deleted = 0
            ORDER BY wt.due_date ASC, wt.created_at ASC
        `;

        const result = await executeQuery(query, [
            { name: 'userId', type: sql.UniqueIdentifier, value: userId }
        ]);

        return result.recordset;
    }

    /**
     * Gets overdue tasks.
     * 
     * @async
     * @param {number} [daysThreshold=0] - Days threshold
     * @returns {Promise<Array>} Array of overdue tasks
     */
    async getOverdueTasks(daysThreshold = 0) {
        const query = `
            SELECT 
                wt.*,
                p.first_name + ' ' + p.last_name as assigned_to_name,
                p.email as assigned_to_email,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                DATEDIFF(day, wt.due_date, GETDATE()) as days_overdue
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            LEFT JOIN ip_records ir ON wt.ip_record_id = ir.ip_record_id
            WHERE wt.task_status = 'Pending'
            AND wt.due_date < GETDATE()
            AND wt.is_deleted = 0
            ORDER BY wt.due_date ASC
        `;

        const result = await executeQuery(query);
        return result.recordset;
    }

    /**
     * Updates task status.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} status - New status ('Pending', 'In Progress', 'Completed', 'Cancelled', 'Overdue')
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated task
     */
    async updateTaskStatus(taskId, status, updatedBy, metadata = null) {
        if (!taskId || !status) {
            throw new Error('Task ID and status are required');
        }

        let query = `
            UPDATE workflow_tasks
            SET task_status = @status,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'taskId', type: sql.UniqueIdentifier, value: taskId },
            { name: 'status', value: status }
        ];

        if (status === 'Completed') {
            query += `, completed_date = GETDATE()`;
        }

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE workflow_task_id = @taskId`;

        await executeQuery(query, params);

        logger.info('Task status updated', { taskId, status, updatedBy });
        return this.getTaskById(taskId);
    }

    /**
     * Updates task assignment.
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} assignedTo - User UUID
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated task
     */
    async updateTaskAssignment(taskId, assignedTo, updatedBy) {
        if (!taskId || !assignedTo) {
            throw new Error('Task ID and assigned user are required');
        }

        const query = `
            UPDATE workflow_tasks
            SET assigned_to = @assignedTo,
                updated_at = GETDATE()
            WHERE workflow_task_id = @taskId
        `;

        await executeQuery(query, [
            { name: 'taskId', type: sql.UniqueIdentifier, value: taskId },
            { name: 'assignedTo', type: sql.UniqueIdentifier, value: assignedTo }
        ]);

        logger.info('Task reassigned', { taskId, assignedTo, updatedBy });
        return this.getTaskById(taskId);
    }

    /**
     * Gets workflow statistics.
     * 
     * @async
     * @returns {Promise<Object>} Workflow statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN task_status = 'Pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN task_status = 'In Progress' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN task_status = 'Completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN task_status = 'Cancelled' THEN 1 END) as cancelled_tasks,
                COUNT(CASE WHEN task_status = 'Overdue' THEN 1 END) as overdue_tasks,
                COUNT(CASE WHEN wt.due_date < GETDATE() AND wt.task_status = 'Pending' THEN 1 END) as truly_overdue,
                AVG(DATEDIFF(day, wt.created_at, wt.completed_date)) as avg_completion_days,
                COUNT(DISTINCT wt.ip_record_id) as ip_records_with_tasks
            FROM workflow_tasks wt
            WHERE wt.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Gets task count by status for a user.
     * 
     * @async
     * @param {string} userId - User UUID
     * @returns {Promise<Object>} Task counts
     */
    async getUserTaskCounts(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const query = `
            SELECT 
                COUNT(CASE WHEN task_status = 'Pending' THEN 1 END) as pending,
                COUNT(CASE WHEN task_status = 'In Progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN task_status = 'Completed' THEN 1 END) as completed,
                COUNT(CASE WHEN task_status = 'Overdue' THEN 1 END) as overdue,
                COUNT(CASE WHEN task_status = 'Pending' AND due_date < GETDATE() THEN 1 END) as overdue_pending,
                COUNT(*) as total
            FROM workflow_tasks
            WHERE assigned_to = @userId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'userId', type: sql.UniqueIdentifier, value: userId }
        ]);

        return result.recordset[0] || {};
    }

    /**
     * Gets workflow definitions by record type with tasks.
     * 
     * @async
     * @param {string} recordType - Record type
     * @returns {Promise<Array>} Array of workflow definitions with sequence
     */
    async getWorkflowTemplate(recordType) {
        if (!recordType) {
            throw new Error('Record type is required');
        }

        const query = `
            SELECT 
                workflow_definition_id,
                workflow_name,
                record_type,
                sequence_no,
                task_name,
                assigned_role,
                mandatory,
                description,
                created_at
            FROM workflow_definitions
            WHERE record_type = @recordType
            ORDER BY sequence_no ASC
        `;

        const result = await executeQuery(query, [
            { name: 'recordType', value: recordType }
        ]);

        return result.recordset;
    }

    /**
     * Creates workflow definitions from a template.
     * 
     * @async
     * @param {string} recordType - Record type
     * @param {Array} definitions - Array of definition objects
     * @param {string} createdBy - User UUID
     * @returns {Promise<Array>} Created definition IDs
     */
    async createWorkflowTemplate(recordType, definitions, createdBy) {
        if (!recordType || !definitions || definitions.length === 0) {
            throw new Error('Record type and definitions are required');
        }

        const createdIds = [];

        for (const def of definitions) {
            const defId = this.generateId();
            const query = `
                INSERT INTO workflow_definitions (
                    workflow_definition_id,
                    workflow_name,
                    record_type,
                    sequence_no,
                    task_name,
                    assigned_role,
                    mandatory,
                    description,
                    created_at
                ) VALUES (
                    @defId,
                    @workflowName,
                    @recordType,
                    @sequenceNo,
                    @taskName,
                    @assignedRole,
                    @mandatory,
                    @description,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'defId', type: sql.UniqueIdentifier, value: defId },
                { name: 'workflowName', value: def.workflowName || `${recordType} Workflow` },
                { name: 'recordType', value: recordType },
                { name: 'sequenceNo', value: def.sequenceNo || 1 },
                { name: 'taskName', value: def.taskName },
                { name: 'assignedRole', value: def.assignedRole || null },
                { name: 'mandatory', value: def.mandatory !== undefined ? def.mandatory : 1 },
                { name: 'description', value: def.description || null }
            ]);

            createdIds.push(defId);
        }

        logger.info('Workflow template created', { recordType, createdIds });
        return createdIds;
    }

    /**
     * Deletes a workflow task (soft delete).
     * 
     * @async
     * @param {string} taskId - Task UUID
     * @param {string} updatedBy - User UUID
     * @returns {Promise<boolean>} True if successful
     */
    async deleteTask(taskId, updatedBy) {
        if (!taskId) {
            throw new Error('Task ID is required');
        }

        const query = `
            UPDATE workflow_tasks
            SET is_deleted = 1,
                updated_at = GETDATE()
            WHERE workflow_task_id = @taskId
        `;

        await executeQuery(query, [
            { name: 'taskId', type: sql.UniqueIdentifier, value: taskId }
        ]);

        logger.info('Workflow task deleted', { taskId, updatedBy });
        return true;
    }

    /**
     * Gets tasks by status.
     * 
     * @async
     * @param {string} status - Task status
     * @returns {Promise<Array>} Array of tasks
     */
    async getTasksByStatus(status) {
        if (!status) {
            throw new Error('Status is required');
        }

        const query = `
            SELECT 
                wt.*,
                p.first_name + ' ' + p.last_name as assigned_to_name,
                p.email as assigned_to_email,
                ir.reference_number as ip_reference,
                ir.title as ip_title
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            LEFT JOIN ip_records ir ON wt.ip_record_id = ir.ip_record_id
            WHERE wt.task_status = @status AND wt.is_deleted = 0
            ORDER BY wt.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'status', value: status }
        ]);

        return result.recordset;
    }

    /**
     * Gets tasks by priority.
     * 
     * @async
     * @param {string} priority - Priority level ('High', 'Medium', 'Normal', 'Low')
     * @returns {Promise<Array>} Array of tasks
     */
    async getTasksByPriority(priority) {
        if (!priority) {
            throw new Error('Priority is required');
        }

        const query = `
            SELECT 
                wt.*,
                p.first_name + ' ' + p.last_name as assigned_to_name,
                ir.reference_number as ip_reference,
                ir.title as ip_title
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            LEFT JOIN ip_records ir ON wt.ip_record_id = ir.ip_record_id
            WHERE wt.priority = @priority AND wt.is_deleted = 0
            ORDER BY wt.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'priority', value: priority }
        ]);

        return result.recordset;
    }
}

module.exports = new WorkflowRepository();