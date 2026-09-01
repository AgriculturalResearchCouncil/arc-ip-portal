const { executeQuery, executeTransaction, sql } = require('../index');
const logger = require('../../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Base repository providing common CRUD operations
 */
class BaseRepository {
    constructor(tableName, primaryKey = 'id', schema = 'dbo') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
        this.schema = schema;
        this.fullTableName = `${schema}.${tableName}`;
    }

    /**
     * Generate a new UUID
     */
    generateId() {
        return uuidv4();
    }

    /**
     * Build WHERE clause from filters
     */
    buildWhereClause(filters, params) {
        if (!filters || Object.keys(filters).length === 0) {
            return { whereClause: '', params: [] };
        }

        const conditions = [];
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (typeof value === 'string' && value.includes('%')) {
                    conditions.push(`${key} LIKE @${key}`);
                } else {
                    conditions.push(`${key} = @${key}`);
                }
                params.push({ name: key, value });
            }
        });

        return {
            whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
            params,
        };
    }

    /**
     * Find record by primary key
     */
    async findById(id, columns = '*', includeDeleted = false) {
        const query = `
            SELECT ${columns} 
            FROM ${this.fullTableName} 
            WHERE ${this.primaryKey} = @id 
            ${!includeDeleted ? 'AND is_deleted = 0' : ''}
        `;
        
        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);
        
        return result.recordset[0] || null;
    }

    /**
     * Find all records with optional filtering
     */
    async findAll(filters = {}, options = {}) {
        let query = `SELECT * FROM ${this.fullTableName} WHERE 1=1`;
        let params = [];
        let filterParams = [];

        // Apply filters
        const { whereClause, params: filterParamsResult } = this.buildWhereClause(filters, filterParams);
        query += ` ${whereClause}`;

        // Add soft delete filter
        if (!options.includeDeleted) {
            query += ` AND is_deleted = 0`;
        }

        // Add sorting
        if (options.sortBy) {
            const sortOrder = options.sortOrder || 'ASC';
            query += ` ORDER BY ${options.sortBy} ${sortOrder}`;
        } else {
            query += ` ORDER BY created_at DESC`;
        }

        // Add pagination
        if (options.limit) {
            const offset = options.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${options.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, filterParamsResult);
        return result.recordset;
    }

    /**
     * Create a new record
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

        // Add audit fields
        if (!data.created_at) {
            columns.push('created_at');
            values.push(new Date());
            paramNames.push('@created_at');
        }

        const query = `
            INSERT INTO ${this.fullTableName} (${columns.join(', ')})
            VALUES (${paramNames.join(', ')})
            SELECT SCOPE_IDENTITY() as id
        `;

        const params = columns.map((col, index) => ({
            name: col,
            value: values[index]
        }));

        const result = await executeQuery(query, params);
        return this.findById(result.recordset[0]?.id || id);
    }

    /**
     * Update a record
     */
    async update(id, data) {
        const entries = Object.entries(data).filter(([key]) => key !== this.primaryKey);
        if (entries.length === 0) {
            return this.findById(id);
        }

        // Add updated_at
        if (!data.updated_at) {
            entries.push(['updated_at', new Date()]);
        }

        const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ');
        const params = entries.map(([key, value]) => ({
            name: key,
            value: value
        }));

        // Add ID parameter
        params.push({ name: this.primaryKey, value: id });

        const query = `
            UPDATE ${this.fullTableName}
            SET ${setClause}
            WHERE ${this.primaryKey} = @${this.primaryKey}
        `;

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Soft delete a record
     */
    async softDelete(id) {
        const query = `
            UPDATE ${this.fullTableName}
            SET is_deleted = 1, deleted_at = GETDATE()
            WHERE ${this.primaryKey} = @id
        `;
        await executeQuery(query, [{ name: 'id', type: sql.UniqueIdentifier, value: id }]);
        return true;
    }

    /**
     * Hard delete a record (use with caution)
     */
    async hardDelete(id) {
        const query = `DELETE FROM ${this.fullTableName} WHERE ${this.primaryKey} = @id`;
        await executeQuery(query, [{ name: 'id', type: sql.UniqueIdentifier, value: id }]);
        return true;
    }

    /**
     * Count records matching filters
     */
    async count(filters = {}) {
        let query = `SELECT COUNT(*) as count FROM ${this.fullTableName} WHERE 1=1`;
        let params = [];

        const { whereClause, params: filterParams } = this.buildWhereClause(filters, params);
        query += ` ${whereClause}`;
        query += ` AND is_deleted = 0`;

        const result = await executeQuery(query, filterParams);
        return result.recordset[0]?.count || 0;
    }

    /**
     * Check if a record exists
     */
    async exists(id) {
        const count = await this.count({ [this.primaryKey]: id });
        return count > 0;
    }

    /**
     * Execute a transaction with callback
     */
    async transaction(callback) {
        return executeTransaction(callback);
    }

    /**
     * Bulk insert records
     */
    async bulkInsert(records) {
        if (!records || records.length === 0) return [];

        const columns = Object.keys(records[0]);
        const values = [];
        const params = [];

        records.forEach((record, index) => {
            Object.entries(record).forEach(([key, value]) => {
                const paramName = `${key}_${index}`;
                values.push(`@${paramName}`);
                params.push({ name: paramName, value });
            });
        });

        const query = `
            INSERT INTO ${this.fullTableName} (${columns.join(', ')})
            VALUES (${values.join(', ')})
        `;

        await executeQuery(query, params);
        return true;
    }
}

module.exports = BaseRepository;