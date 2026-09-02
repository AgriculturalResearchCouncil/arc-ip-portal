/**
 * Workflow Repository
 * ===================
 * Manages database operations for workflow tables.
 * 
 * Database Schema (workflow_definitions):
 * - workflow_definition_id (uniqueidentifier, PK)
 * - workflow_name (nvarchar, required)
 * - record_type (nvarchar, required) - 'disclosure', 'licence', 'evaluation'
 * - sequence_no (int, required)
 * - task_name (nvarchar, required)
 * - assigned_role (nvarchar, nullable)
 * - mandatory (bit, nullable)
 * - description (nvarchar, nullable)
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Database Schema (workflow_tasks):
 * - workflow_task_id (uniqueidentifier, PK)
 * - ip_record_id (uniqueidentifier, nullable, FK to ip_records)
 * - task_name (nvarchar, required)
 * - task_type (nvarchar, nullable)
 * - assigned_to (uniqueidentifier, nullable, FK to persons)
 * - due_date (date, nullable)
 * - completed_date (date, nullable)
 * - task_status (nvarchar, nullable) - 'Pending', 'In Progress', 'Completed', 'Cancelled', 'Overdue'
 * - priority (nvarchar, nullable) - 'Low', 'Normal', 'High', 'Urgent'
 * - comments (nvarchar, nullable)
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Note: There is NO 'is_deleted' column in these tables.
 * 
 * @module repositories/workflow.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
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

    // ============================================================
    // WORKFLOW DEFINITIONS
    // ============================================================

    /**
     * Gets workflow definitions by record type.
     * 
     * @async
     * @param {string} recordType - Record type ('disclosure', 'licence', 'evaluation')
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
     * Creates workflow tasks from definitions for a record.
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
                    'Pending',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'taskId', type: sql.UniqueIdentifier, value: taskId },
                { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
                { name: 'taskName', value: def.task_name },
                { name: 'taskType', value: 'Task' },
                { name: 'assignedTo', type: sql.UniqueIdentifier, value: assignedTo || null },
                { name: 'dueDate', value: dueDate || null },
                { name: 'priority', value: 'Normal' }
            ]);

            taskIds.push(taskId);
        }

        logger.info('Workflow tasks created from definitions', { 
            ipRecordId, 
            recordType, 
            taskCount: taskIds.length 
        });

        return taskIds;
    }

    // ============================================================
    // WORKFLOW TASKS
    // ============================================================

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
                p.email as assigned_to_email,
                ir.reference_number as ip_reference
            FROM workflow_tasks wt
            LEFT JOIN persons p ON wt.assigned_to = p.person_id
            LEFT JOIN ip_records ir ON wt.ip_record_id = ir.ip_record_id
            WHERE wt.ip_record_id = @ipRecordId
            ORDER BY wt.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
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
            WHERE wt.workflow_task_id = @taskId
        `;

        const result = await executeQuery(query, [
            { name: 'taskId', type: sql.UniqueIdentifier, value: taskId }
        ]);

        return result.recordset[0] || null;
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
            ORDER BY wt.due_date ASC, wt.created_at ASC
        `;

        const result = await executeQuery(query, [
            { name: 'userId', type: sql.UniqueIdentifier, value: userId }
        ]);

        return result.recordset;
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
            ORDER BY wt.due_date ASC
        `;

        const result = await executeQuery(query);
        return result.recordset;
    }

    /**
     * Gets task counts for a user.
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
            WHERE assigned_to = @userId
        `;

        const result = await executeQuery(query, [
            { name: 'userId', type: sql.UniqueIdentifier, value: userId }
        ]);

        return result.recordset[0] || {};
    }
}

module.exports = new WorkflowRepository();