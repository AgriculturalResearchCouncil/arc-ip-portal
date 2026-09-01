const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');

class PersonRepository extends BaseRepository {
    constructor() {
        super('persons', 'person_id');
    }

    /**
     * Find a person by email
     */
    async findByEmail(email) {
        const query = `
            SELECT * FROM persons 
            WHERE email = @email AND is_deleted = 0
        `;
        const result = await executeQuery(query, [
            { name: 'email', value: email }
        ]);
        return result.recordset[0] || null;
    }

    /**
     * Find a person by employee ID
     */
    async findByEmployeeId(employeeNumber) {
        const query = `
            SELECT * FROM persons 
            WHERE employee_number = @employeeNumber AND is_deleted = 0
        `;
        const result = await executeQuery(query, [
            { name: 'employeeNumber', value: employeeNumber }
        ]);
        return result.recordset[0] || null;
    }

    /**
     * Get user's roles
     */
    async getUserRoles(personId) {
        const query = `
            SELECT r.role_id, r.role_name, r.description, pr.created_at as assigned_at
            FROM person_roles pr
            JOIN roles r ON pr.role_id = r.role_id
            WHERE pr.person_id = @personId
            AND pr.is_active = 1
            AND r.is_active = 1
        `;
        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);
        return result.recordset;
    }

    /**
     * Check if person has a specific role
     */
    async hasRole(personId, roleName) {
        const roles = await this.getUserRoles(personId);
        return roles.some(r => r.role_name === roleName);
    }

    /**
     * Assign a role to a person
     */
    async assignRole(personId, roleName) {
        // First, get the role ID
        const roleQuery = `SELECT role_id FROM roles WHERE role_name = @roleName AND is_active = 1`;
        const roleResult = await executeQuery(roleQuery, [
            { name: 'roleName', value: roleName }
        ]);

        if (!roleResult.recordset[0]) {
            throw new Error(`Role '${roleName}' not found`);
        }

        const roleId = roleResult.recordset[0].role_id;
        const personRoleId = this.generateId();

        // Check if already assigned
        const checkQuery = `
            SELECT * FROM person_roles 
            WHERE person_id = @personId AND role_id = @roleId AND is_active = 1
        `;
        const checkResult = await executeQuery(checkQuery, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleId', type: sql.UniqueIdentifier, value: roleId }
        ]);

        if (checkResult.recordset.length > 0) {
            return true; // Already assigned
        }

        const insertQuery = `
            INSERT INTO person_roles (person_role_id, person_id, role_id, created_at, is_active)
            VALUES (@personRoleId, @personId, @roleId, GETDATE(), 1)
        `;

        await executeQuery(insertQuery, [
            { name: 'personRoleId', type: sql.UniqueIdentifier, value: personRoleId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleId', type: sql.UniqueIdentifier, value: roleId }
        ]);

        return true;
    }

    /**
     * Remove a role from a person
     */
    async removeRole(personId, roleName) {
        const query = `
            UPDATE pr
            SET pr.is_active = 0
            FROM person_roles pr
            JOIN roles r ON pr.role_id = r.role_id
            WHERE pr.person_id = @personId
            AND r.role_name = @roleName
        `;

        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'roleName', value: roleName }
        ]);

        return true;
    }

    /**
     * Get all users with their roles and institutes
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
                i.name as institute_name,
                STRING_AGG(r.role_name, ', ') AS roles
            FROM persons p
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            LEFT JOIN person_roles pr ON p.person_id = pr.person_id AND pr.is_active = 1
            LEFT JOIN roles r ON pr.role_id = r.role_id AND r.is_active = 1
            WHERE p.is_deleted = 0
            GROUP BY 
                p.person_id,
                p.first_name,
                p.last_name,
                p.email,
                p.employee_number,
                p.position_title,
                p.active,
                p.created_at,
                i.name
            ORDER BY p.last_name, p.first_name
        `;
        const result = await executeQuery(query);
        return result.recordset;
    }

    /**
     * Update last login timestamp
     */
    async updateLastLogin(personId) {
        const query = `
            UPDATE persons
            SET last_login = GETDATE()
            WHERE person_id = @personId
        `;
        await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);
        return true;
    }

    /**
     * Search persons by name or email
     */
    async search(query) {
        const searchTerm = `%${query}%`;
        const sqlQuery = `
            SELECT 
                person_id,
                first_name,
                last_name,
                email,
                employee_number,
                position_title,
                institute_id
            FROM persons
            WHERE is_deleted = 0
            AND active = 1
            AND (
                first_name LIKE @searchTerm
                OR last_name LIKE @searchTerm
                OR email LIKE @searchTerm
                OR CONCAT(first_name, ' ', last_name) LIKE @searchTerm
                OR employee_number LIKE @searchTerm
            )
            ORDER BY last_name, first_name
            OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
        `;
        const result = await executeQuery(sqlQuery, [
            { name: 'searchTerm', value: searchTerm }
        ]);
        return result.recordset;
    }

    /**
     * Get persons by institute
     */
    async findByInstitute(instituteId) {
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
            AND is_deleted = 0
            AND active = 1
            ORDER BY last_name, first_name
        `;
        const result = await executeQuery(query, [
            { name: 'instituteId', type: sql.UniqueIdentifier, value: instituteId }
        ]);
        return result.recordset;
    }
}

module.exports = new PersonRepository();