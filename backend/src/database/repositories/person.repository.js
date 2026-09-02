/**
 * Person Repository
 * =================
 * Manages database operations for the persons table.
 * 
 * Database Schema (persons table):
 * - person_id (uniqueidentifier, PK)
 * - employee_number (nvarchar, nullable)
 * - first_name (nvarchar, required)
 * - last_name (nvarchar, required)
 * - email (nvarchar, required)
 * - institute_id (uniqueidentifier, nullable, FK to institutes)
 * - position_title (nvarchar, nullable)
 * - active (bit, nullable)
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * @module repositories/person.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

class PersonRepository extends BaseRepository {
    constructor() {
        super('persons', 'person_id');
    }

    // ============================================================
    // USER LOOKUP METHODS
    // ============================================================

    /**
     * Finds a person by their email address.
     * 
     * @async
     * @param {string} email - The person's email address
     * @returns {Promise<Object|null>} Person object or null
     */
    async findByEmail(email) {
        if (!email) {
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
     * 
     * @async
     * @param {string} employeeNumber - The employee's staff number
     * @returns {Promise<Object|null>} Person object or null
     */
    async findByEmployeeId(employeeNumber) {
        if (!employeeNumber) {
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
     * Finds a person by ID with all related data.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<Object|null>} Complete person object
     */
    async findByIdWithDetails(personId) {
        if (!personId) {
            return null;
        }

        const query = `
            SELECT 
                p.*,
                i.institute_name as institute_name,
                STRING_AGG(r.role_name, ', ') as roles
            FROM persons p
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            LEFT JOIN person_roles pr ON p.person_id = pr.person_id
            LEFT JOIN roles r ON pr.role_id = r.role_id
            WHERE p.person_id = @personId
            GROUP BY 
                p.person_id, p.first_name, p.last_name, p.email, 
                p.employee_number, p.position_title, p.active,
                p.created_at, p.updated_at,
                p.institute_id, i.institute_name
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const person = result.recordset[0];
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
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<Array>} Array of role objects
     */
    async getUserRoles(personId) {
        if (!personId) {
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
     */
    async hasRole(personId, roleName) {
        if (!personId || !roleName) {
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

        // Step 1: Get the role ID
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

        // Step 2: Check if already assigned
        const checkQuery = `
            SELECT * FROM person_roles 
            WHERE person_id = @personId AND role_id = @roleId
        `;
        const checkResult = await executeQuery(checkQuery, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleId', type: sql.UniqueIdentifier, value: roleId }
        ]);

        if (checkResult.recordset.length > 0) {
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

        logger.info('Role assigned', { personId, roleName });
        return true;
    }

    /**
     * Removes a role from a person.
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

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleName', value: roleName }
        ]);

        logger.info('Role removed', { personId, roleName });
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
                p.updated_at,
                i.institute_name as institute_name,
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
                p.updated_at,
                i.institute_name
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
    // USER ACTIVITY METHODS
    // ============================================================

    /**
     * Updates the last login timestamp.
     * Note: persons table doesn't have last_login column, so this is a no-op.
     * 
     * @async
     * @param {string} personId - The person's UUID
     * @returns {Promise<boolean>} True if update was successful
     */
    async updateLastLogin(personId) {
        // persons table doesn't have last_login column
        // This is a no-op - just return true
        logger.debug('updateLastLogin called but last_login column does not exist');
        return true;
    }

    // ============================================================
    // USER MANAGEMENT METHODS
    // ============================================================

    /**
     * Deactivates a user account.
     * Sets active = 0.
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
            SET active = 0
            WHERE person_id = @personId
        `;

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
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
            SET active = 1
            WHERE person_id = @personId
        `;

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        logger.info('User reactivated', { personId });
        return true;
    }

    // ============================================================
    // STATISTICS METHODS
    // ============================================================

    /**
     * Gets user statistics.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN active = 1 THEN 1 END) as active_users,
                COUNT(CASE WHEN active = 0 THEN 1 END) as inactive_users
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

        const entries = Object.entries(data)
            .filter(([key]) => key !== 'person_id' && key !== 'updated_at')
            .filter(([_, value]) => value !== undefined && value !== null);

        if (entries.length === 0) {
            return this.findById(id);
        }

        const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ');
        const params = entries.map(([key, value]) => ({
            name: key,
            value: value
        }));

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

module.exports = new PersonRepository();