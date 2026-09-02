/**
 * Base Repository
 * ===============
 * Provides common CRUD (Create, Read, Update, Delete) operations for all repositories.
 * This abstract class reduces code duplication and ensures consistent data access patterns.
 * 
 * Database Schema Notes:
 * - Your database does NOT have an 'is_deleted' column in any table
 * - Soft deletes are handled via the 'active' column in the persons table (0 = inactive)
 * - Other tables use hard deletes or status-based tracking
 * 
 * @module repositories/base.repository
 * @requires ../index
 * @requires uuid
 */

const { executeQuery, sql } = require('../index');
const { v4: uuidv4 } = require('uuid');

/**
 * BaseRepository class providing common database operations.
 * 
 * @class BaseRepository
 * @property {string} tableName - Name of the database table
 * @property {string} primaryKey - Name of the primary key column
 */
class BaseRepository {
    /**
     * Creates an instance of BaseRepository.
     * 
     * @param {string} tableName - Name of the database table (e.g., 'persons', 'ip_records')
     * @param {string} primaryKey - Name of the primary key column (default: 'id')
     */
    constructor(tableName, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
    }

    /**
     * Generates a new UUID v4 string for primary keys.
     * 
     * @returns {string} A new UUID v4 string
     */
    generateId() {
        return uuidv4();
    }

    /**
     * Finds a record by its primary key.
     * 
     * @async
     * @param {string} id - The primary key value (UUID)
     * @param {string} [columns='*'] - Columns to select
     * @returns {Promise<Object|null>} The record object or null if not found
     * 
     * @example
     * const person = await repo.findById('123e4567-e89b-12d3-a456-426614174000');
     */
    async findById(id, columns = '*') {
        if (!id) {
            return null;
        }

        const query = `
            SELECT ${columns} 
            FROM ${this.tableName} 
            WHERE ${this.primaryKey} = @id
        `;
        
        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);
        
        return result.recordset[0] || null;
    }

    /**
     * Finds all records with optional filtering, sorting, and pagination.
     * 
     * @async
     * @param {Object} [filters={}] - Key-value pairs for WHERE clause
     * @param {Object} [options={}] - Query options
     * @param {string} [options.sortBy] - Column to sort by
     * @param {string} [options.sortOrder='ASC'] - Sort order ('ASC' or 'DESC')
     * @param {number} [options.limit] - Maximum records to return
     * @param {number} [options.offset=0] - Records to skip (for pagination)
     * @returns {Promise<Array>} Array of record objects
     * 
     * @example
     * const users = await repo.findAll(
     *   { status: 'Active' },
     *   { sortBy: 'created_at', sortOrder: 'DESC', limit: 10 }
     * );
     */
    async findAll(filters = {}, options = {}) {
        let query = `SELECT * FROM ${this.tableName} WHERE 1=1`;
        let params = [];

        // Apply filters
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

        // Apply sorting
        if (options.sortBy) {
            const sortOrder = options.sortOrder || 'ASC';
            query += ` ORDER BY ${options.sortBy} ${sortOrder}`;
        } else if (this.tableName === 'ip_records') {
            query += ` ORDER BY created_at DESC`;
        }

        // Apply pagination
        if (options.limit) {
            const offset = options.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Creates a new record in the database.
     * Automatically generates a UUID if no primary key is provided.
     * 
     * @async
     * @param {Object} data - Key-value pairs for the new record
     * @returns {Promise<Object>} The created record
     * @throws {Error} If creation fails
     * 
     * @example
     * const newPerson = await repo.create({
     *   first_name: 'John',
     *   last_name: 'Doe',
     *   email: 'john@example.com'
     * });
     */
    async create(data) {
        const id = data[this.primaryKey] || this.generateId();
        const columns = Object.keys(data);
        const values = Object.values(data);
        const paramNames = columns.map(col => `@${col}`);

        // Ensure ID is set
        if (!data[this.primaryKey]) {
            columns.push(this.primaryKey);
            values.push(id);
            paramNames.push(`@${this.primaryKey}`);
        }

        // Add created_at timestamp if not provided
        if (!data.created_at) {
            columns.push('created_at');
            values.push(new Date());
            paramNames.push('@created_at');
        }

        const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')})
            VALUES (${paramNames.join(', ')})
        `;

        const params = columns.map((col, index) => ({
            name: col,
            value: values[index]
        }));

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Updates an existing record.
     * 
     * @async
     * @param {string} id - The primary key value
     * @param {Object} data - Key-value pairs to update
     * @returns {Promise<Object>} The updated record
     * @throws {Error} If update fails
     * 
     * @example
     * const updated = await repo.update(userId, {
     *   first_name: 'Jane',
     *   last_name: 'Smith'
     * });
     */
    async update(id, data) {
        if (!id) {
            throw new Error('ID is required');
        }

        // Filter out primary key and updated_at (handled by database)
        const entries = Object.entries(data)
            .filter(([key]) => key !== this.primaryKey && key !== 'updated_at')
            .filter(([_, value]) => value !== undefined && value !== null);

        if (entries.length === 0) {
            return this.findById(id);
        }

        const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ');
        const params = entries.map(([key, value]) => ({
            name: key,
            value: value
        }));

        params.push({ name: this.primaryKey, value: id });

        const query = `
            UPDATE ${this.tableName}
            SET ${setClause}
            WHERE ${this.primaryKey} = @${this.primaryKey}
        `;

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Permanently deletes a record from the database.
     * Use with caution - this cannot be undone.
     * 
     * @async
     * @param {string} id - The primary key value
     * @returns {Promise<boolean>} True if successful
     * @warning This permanently deletes data - use softDelete when possible
     * 
     * @example
     * await repo.delete(testId);
     */
    async delete(id) {
        if (!id) {
            throw new Error('ID is required');
        }

        const query = `
            DELETE FROM ${this.tableName}
            WHERE ${this.primaryKey} = @id
        `;
        
        await executeQuery(query, [{ name: 'id', type: sql.UniqueIdentifier, value: id }]);
        return true;
    }

    /**
     * Counts records matching the given filters.
     * 
     * @async
     * @param {Object} [filters={}] - Key-value pairs for filtering
     * @returns {Promise<number>} The count of matching records
     * 
     * @example
     * const count = await repo.count({ status: 'Active' });
     */
    async count(filters = {}) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE 1=1`;
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

module.exports = BaseRepository;