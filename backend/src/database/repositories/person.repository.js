/**
 * Person Repository
 * =================
 * Manages database operations for the persons table.
 * Handles all user-related database operations including:
 * - User CRUD operations (Create, Read, Update, Delete)
 * - User lookup by email, employee ID, or ID
 * - Role management (assign, remove, check roles)
 * - User search and filtering
 * - User statistics and reporting
 * - User activation/deactivation
 * 
 * Database Schema Notes:
 * - The persons table does NOT have an 'is_deleted' column
 * - The roles table has only: role_id, role_name, description (no is_active)
 * - The person_roles table has only: person_role_id, person_id, role_id, created_at (no is_active)
 * - Soft deletes are handled via the 'active' column in persons (0 = inactive)
 * - Roles are managed through the person_roles junction table
 * - Each user can have multiple roles
 * 
 * @module repositories/person.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * PersonRepository class for managing user/person data.
 * Extends BaseRepository with person-specific operations.
 * 
 * @class PersonRepository
 * @extends BaseRepository
 */
class PersonRepository extends BaseRepository {
    /**
     * Creates an instance of PersonRepository.
     * Initializes with the 'persons' table and 'person_id' as primary key.
     */
    constructor() {
        super('persons', 'person_id');
    }

    // ============================================================
    // USER LOOKUP METHODS
    // ============================================================

    /**
     * Finds a person by their email address.
     * Email addresses are unique in the system.
     * 
     * @async
     * @param {string} email - The person's email address
     * @returns {Promise<Object|null>} Person object or null if not found
     * 
     * @example
     * const user = await personRepository.findByEmail('john.doe@arc.agric.za');
     */
    async findByEmail(email) {
        if (!email) {
            logger.warn('findByEmail called with null/undefined email');
            return null;
        }

        const query = `
            SELECT * FROM persons 
            WHERE email = @email
        `;
        
        const result = await executeQuery(query, [
            { name: 'email', value: email.toLowerCase().trim() }
        ]);
        
        return result.recordset[0] || null;
    }

    /**
     * Finds a person by their employee number.
     * Employee numbers are unique identifiers from the HR system.
     * 
     * @async
     * @param {string} employeeNumber - The employee's staff number
     * @returns {Promise<Object|null>} Person object or null if not found
     */
    async findByEmployeeId(employeeNumber) {
        if (!employeeNumber) {
            logger.warn('findByEmployeeId called with null/undefined employee number');
            return null;
        }

        const query = `
            SELECT * FROM persons 
            WHERE employee_number = @employeeNumber
        `;
        
        const result = await executeQuery(query, [
            { name: 'employeeNumber', value: employeeNumber }
        ]);
        
        return result.recordset[0] || null;
    }

    /**
     * Finds a person by their primary key with all related data.
     * Includes roles, institute information, and activity status.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<Object|null>} Complete person object or null
     */
    async findByIdWithDetails(personId) {
        if (!personId) {
            logger.warn('findByIdWithDetails called with null/undefined personId');
            return null;
        }

        const query = `
            SELECT 
                p.*,
                i.name as institute_name,
                STRING_AGG(r.role_name, ', ') as roles
            FROM persons p
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            LEFT JOIN person_roles pr ON p.person_id = pr.person_id
            LEFT JOIN roles r ON pr.role_id = r.role_id
            WHERE p.person_id = @personId
            GROUP BY 
                p.person_id, p.first_name, p.last_name, p.email, 
                p.employee_number, p.position_title, p.active,
                p.created_at, p.updated_at, p.last_login,
                p.institute_id, i.name
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const person = result.recordset[0];
        
        // Parse the comma-separated roles string into an array
        if (person.roles) {
            person.roles = person.roles.split(', ').filter(Boolean);
        } else {
            person.roles = [];
        }

        return person;
    }

    // ============================================================
    // ROLE MANAGEMENT METHODS
    // ============================================================

    /**
     * Gets all roles assigned to a person.
     * Note: No is_active column in person_roles, so all roles are considered active.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<Array>} Array of role objects
     * 
     * @example
     * const roles = await personRepository.getUserRoles(personId);
     * roles.forEach(role => {
     *   console.log(role.role_name);
     * });
     */
    async getUserRoles(personId) {
        if (!personId) {
            logger.warn('getUserRoles called with null/undefined personId');
            return [];
        }

        const query = `
            SELECT 
                r.role_id, 
                r.role_name, 
                r.description,
                pr.created_at as assigned_at
            FROM person_roles pr
            JOIN roles r ON pr.role_id = r.role_id
            WHERE pr.person_id = @personId
            ORDER BY r.role_name
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Checks if a person has a specific role.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @param {string} roleName - Name of the role to check
     * @returns {Promise<boolean>} True if the person has the role
     * 
     * @example
     * const isTTO = await personRepository.hasRole(personId, 'TTO Officer');
     */
    async hasRole(personId, roleName) {
        if (!personId || !roleName) {
            logger.warn('hasRole called with null/undefined parameters');
            return false;
        }

        const roles = await this.getUserRoles(personId);
        return roles.some(r => r.role_name === roleName);
    }

    /**
     * Assigns a role to a person.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @param {string} roleName - Name of the role to assign
     * @returns {Promise<boolean>} True if assignment was successful
     * @throws {Error} If the role doesn't exist
     */
    async assignRole(personId, roleName) {
        if (!personId || !roleName) {
            throw new Error('Person ID and role name are required');
        }

        // Step 1: Get the role ID from the roles table
        const roleQuery = `
            SELECT role_id FROM roles 
            WHERE role_name = @roleName
        `;
        
        const roleResult = await executeQuery(roleQuery, [
            { name: 'roleName', value: roleName }
        ]);

        if (!roleResult.recordset[0]) {
            throw new Error(`Role '${roleName}' not found`);
        }

        const roleId = roleResult.recordset[0].role_id;
        const personRoleId = this.generateId();

        // Step 2: Check if the role is already assigned
        const checkQuery = `
            SELECT * FROM person_roles 
            WHERE person_id = @personId AND role_id = @roleId
        `;
        const checkResult = await executeQuery(checkQuery, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleId', type: sql.UniqueIdentifier, value: roleId }
        ]);

        // If already assigned, return true (no change needed)
        if (checkResult.recordset.length > 0) {
            logger.info('Role already assigned', { personId, roleName });
            return true;
        }

        // Step 3: Assign the role
        const insertQuery = `
            INSERT INTO person_roles (person_role_id, person_id, role_id, created_at)
            VALUES (@personRoleId, @personId, @roleId, GETDATE())
        `;

        await executeQuery(insertQuery, [
            { name: 'personRoleId', type: sql.UniqueIdentifier, value: personRoleId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleId', type: sql.UniqueIdentifier, value: roleId }
        ]);

        logger.info('Role assigned successfully', { personId, roleName });
        return true;
    }

    /**
     * Removes a role from a person.
     * Since there is no is_active column, we delete the record completely.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @param {string} roleName - Name of the role to remove
     * @returns {Promise<boolean>} True if removal was successful
     */
    async removeRole(personId, roleName) {
        if (!personId || !roleName) {
            throw new Error('Person ID and role name are required');
        }

        const query = `
            DELETE pr
            FROM person_roles pr
            JOIN roles r ON pr.role_id = r.role_id
            WHERE pr.person_id = @personId
            AND r.role_name = @roleName
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleName', value: roleName }
        ]);

        if (result.rowsAffected && result.rowsAffected[0] > 0) {
            logger.info('Role removed successfully', { personId, roleName });
        } else {
            logger.info('Role was not assigned', { personId, roleName });
        }

        return true;
    }

    // ============================================================
    // USER LISTING AND SEARCH METHODS
    // ============================================================

    /**
     * Gets all users with their roles and institute information.
     * 
     * @async
     * @returns {Promise<Array>} Array of user objects with roles
     */
    async getAllUsersWithRoles() {
        const query = `
            SELECT 
                p.person_id,
                p.first_name,
                p.last_name,
                p.email,
                p.employee_number,
                p.position_title,
                p.active as is_active,
                p.created_at,
                p.last_login,
                i.name as institute_name,
                STRING_AGG(r.role_name, ', ') AS roles
            FROM persons p
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            LEFT JOIN person_roles pr ON p.person_id = pr.person_id
            LEFT JOIN roles r ON pr.role_id = r.role_id
            GROUP BY 
                p.person_id,
                p.first_name,
                p.last_name,
                p.email,
                p.employee_number,
                p.position_title,
                p.active,
                p.created_at,
                p.last_login,
                i.name
            ORDER BY p.last_name, p.first_name
        `;
        const result = await executeQuery(query);
        
        return result.recordset.map(user => ({
            ...user,
            roles: user.roles ? user.roles.split(', ').filter(Boolean) : []
        }));
    }

    /**
     * Searches for persons by name, email, or employee number.
     * 
     * @async
     * @param {string} searchQuery - The search term
     * @param {number} [limit=20] - Maximum number of results
     * @returns {Promise<Array>} Array of matching person objects
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            logger.warn('Search query too short or empty', { searchQuery });
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        
        const sqlQuery = `
            SELECT 
                person_id,
                first_name,
                last_name,
                email,
                employee_number,
                position_title
            FROM persons
            WHERE active = 1
            AND (
                first_name LIKE @searchTerm
                OR last_name LIKE @searchTerm
                OR email LIKE @searchTerm
                OR CONCAT(first_name, ' ', last_name) LIKE @searchTerm
                OR employee_number LIKE @searchTerm
            )
            ORDER BY 
                CASE 
                    WHEN first_name LIKE @searchTerm OR last_name LIKE @searchTerm THEN 1
                    WHEN email LIKE @searchTerm THEN 2
                    ELSE 3
                END,
                last_name, 
                first_name
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;
        const result = await executeQuery(sqlQuery, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);
        
        return result.recordset;
    }

    /**
     * Gets all persons belonging to a specific institute.
     * 
     * @async
     * @param {string} instituteId - The institute's UUID
     * @returns {Promise<Array>} Array of person objects
     */
    async findByInstitute(instituteId) {
        if (!instituteId) {
            throw new Error('Institute ID is required');
        }

        const query = `
            SELECT 
                person_id,
                first_name,
                last_name,
                email,
                position_title,
                employee_number
            FROM persons
            WHERE institute_id = @instituteId
            AND active = 1
            ORDER BY last_name, first_name
        `;
        const result = await executeQuery(query, [
            { name: 'instituteId', type: sql.UniqueIdentifier, value: instituteId }
        ]);
        
        return result.recordset;
    }

    // ============================================================
    // USER ACTIVITY AND AUDIT METHODS
    // ============================================================

    /**
     * Updates the last login timestamp for a person.
     * Called when a user successfully authenticates.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<boolean>} True if update was successful
     */
    async updateLastLogin(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            UPDATE persons
            SET last_login = GETDATE()
            WHERE person_id = @personId
        `;
        
        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);
        
        logger.debug('Last login updated', { personId });
        return true;
    }

    /**
     * Gets recently active users (last 30 days).
     * 
     * @async
     * @param {number} [days=30] - Number of days to check
     * @returns {Promise<Array>} Array of active users
     */
    async getRecentlyActive(days = 30) {
        const query = `
            SELECT 
                person_id,
                first_name,
                last_name,
                email,
                last_login,
                DATEDIFF(day, last_login, GETDATE()) as days_inactive
            FROM persons
            WHERE active = 1
            AND last_login IS NOT NULL
            AND last_login >= DATEADD(day, -@days, GETDATE())
            ORDER BY last_login DESC
        `;

        const result = await executeQuery(query, [
            { name: 'days', value: days }
        ]);

        return result.recordset;
    }

    // ============================================================
    // USER MANAGEMENT METHODS
    // ============================================================

    /**
     * Deactivates a user account.
     * Sets active = 0 but doesn't delete the record.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @param {string} [reason] - Reason for deactivation
     * @returns {Promise<boolean>} True if successful
     */
    async deactivateUser(personId, reason = null) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            UPDATE persons
            SET active = 0,
                deactivation_reason = @reason,
                deactivated_at = GETDATE()
            WHERE person_id = @personId
        `;

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'reason', value: reason || 'No reason provided' }
        ]);

        logger.info('User deactivated', { personId, reason });
        return true;
    }

    /**
     * Reactivates a user account.
     * Sets active = 1.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<boolean>} True if successful
     */
    async reactivateUser(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            UPDATE persons
            SET active = 1,
                deactivation_reason = NULL,
                deactivated_at = NULL
            WHERE person_id = @personId
        `;

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        logger.info('User reactivated', { personId });
        return true;
    }

    // ============================================================
    // STATISTICS AND REPORTING METHODS
    // ============================================================

    /**
     * Gets user statistics for reporting.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_users,
                COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_users,
                COUNT(CASE WHEN last_login >= DATEADD(day, -7, GETDATE()) THEN 1 END) as active_last_7_days,
                COUNT(CASE WHEN last_login >= DATEADD(day, -30, GETDATE()) THEN 1 END) as active_last_30_days,
                COUNT(CASE WHEN last_login IS NULL THEN 1 END) as never_logged_in
            FROM persons
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    // ============================================================
    // CRUD OPERATIONS
    // ============================================================

    /**
     * Finds a person by ID.
     * Overrides BaseRepository.findById to remove 'is_deleted' filter.
     * 
     * @async
     * @param {string} id - The person's UUID
     * @param {string} [columns='*'] - Columns to select
     * @returns {Promise<Object|null>} Person object or null
     */
    async findById(id, columns = '*') {
        if (!id) {
            return null;
        }

        const query = `
            SELECT ${columns} FROM persons 
            WHERE person_id = @id
        `;
        
        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);
        
        return result.recordset[0] || null;
    }

    /**
     * Creates a new person record.
     * 
     * @async
     * @param {Object} data - Person data
     * @param {string} data.first_name - First name (required)
     * @param {string} data.last_name - Last name (required)
     * @param {string} data.email - Email address (required)
     * @param {string} [data.employee_number] - Employee number
     * @param {string} [data.position_title] - Job title
     * @param {string} [data.institute_id] - Institute UUID
     * @param {number} [data.active=1] - Active status
     * @returns {Promise<Object>} Created person
     */
    async create(data) {
        const id = data[this.primaryKey] || this.generateId();
        
        const columns = ['person_id', 'first_name', 'last_name', 'email'];
        const values = [id, data.first_name || 'Unknown', data.last_name || 'User', data.email];
        const paramNames = ['@id', '@firstName', '@lastName', '@email'];

        if (data.employee_number) {
            columns.push('employee_number');
            values.push(data.employee_number);
            paramNames.push('@employeeNumber');
        }

        if (data.position_title) {
            columns.push('position_title');
            values.push(data.position_title);
            paramNames.push('@positionTitle');
        }

        if (data.institute_id) {
            columns.push('institute_id');
            values.push(data.institute_id);
            paramNames.push('@instituteId');
        }

        if (data.active !== undefined) {
            columns.push('active');
            values.push(data.active);
            paramNames.push('@active');
        }

        columns.push('created_at');
        values.push(new Date());
        paramNames.push('@createdAt');

        const query = `
            INSERT INTO persons (${columns.join(', ')})
            VALUES (${paramNames.join(', ')})
        `;

        const params = [
            { name: 'id', type: sql.UniqueIdentifier, value: id },
            { name: 'firstName', value: data.first_name || 'Unknown' },
            { name: 'lastName', value: data.last_name || 'User' },
            { name: 'email', value: data.email },
            { name: 'employeeNumber', value: data.employee_number || null },
            { name: 'positionTitle', value: data.position_title || null },
            { name: 'instituteId', type: sql.UniqueIdentifier, value: data.institute_id || null },
            { name: 'active', value: data.active !== undefined ? data.active : 1 },
            { name: 'createdAt', value: new Date() }
        ];

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Updates a person record.
     * 
     * @async
     * @param {string} id - The person's UUID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated person
     */
    async update(id, data) {
        if (!id) {
            throw new Error('Person ID is required');
        }

        // Filter out the primary key and undefined/null values
        const entries = Object.entries(data)
            .filter(([key]) => key !== 'person_id' && key !== 'updated_at')
            .filter(([_, value]) => value !== undefined && value !== null);

        if (entries.length === 0) {
            return this.findById(id);
        }

        // Build the SET clause dynamically
        const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ');
        
        // Build params array
        const params = entries.map(([key, value]) => ({
            name: key,
            value: value
        }));

        // Add ID parameter
        params.push({ name: 'person_id', value: id });

        const query = `
            UPDATE persons
            SET ${setClause}
            WHERE person_id = @person_id
        `;

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Hard delete a person (use with caution).
     * 
     * @async
     * @param {string} id - The person's UUID
     * @returns {Promise<boolean>} True if successful
     */
    async hardDelete(id) {
        if (!id) {
            throw new Error('Person ID is required');
        }

        // First delete person_roles
        const roleQuery = `
            DELETE FROM person_roles WHERE person_id = @id
        `;
        await executeQuery(roleQuery, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        // Then delete the person
        const query = `
            DELETE FROM persons WHERE person_id = @id
        `;
        await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        logger.warn('Person hard deleted', { id });
        return true;
    }

    /**
     * Counts records matching filters.
     * 
     * @async
     * @param {Object} [filters={}] - Key-value pairs for filtering
     * @returns {Promise<number>} The count of matching records
     */
    async count(filters = {}) {
        let query = `SELECT COUNT(*) as count FROM persons WHERE 1=1`;
        const params = [];

        if (Object.keys(filters).length > 0) {
            const conditions = [];
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    conditions.push(`${key} = @${key}`);
                    params.push({ name: key, value });
                }
            });
            if (conditions.length > 0) {
                query += ` AND ${conditions.join(' AND ')}`;
            }
        }

        const result = await executeQuery(query, params);
        return result.recordset[0]?.count || 0;
    }

    /**
     * Checks if a record exists.
     * 
     * @async
     * @param {string} id - The primary key value
     * @returns {Promise<boolean>} True if the record exists
     */
    async exists(id) {
        const count = await this.count({ [this.primaryKey]: id });
        return count > 0;
    }
}

/**
 * Export a singleton instance of PersonRepository.
 * This ensures all parts of the application use the same repository instance.
 */
module.exports = new PersonRepository();