/**
 * Database Connection Module
 * ==========================
 * This module handles all database operations including connection pooling,
 * query execution, transaction management, and stored procedure execution.
 * It uses Windows Authentication by default (integrated security) for SQL Server.
 * 
 * @module database
 * @requires mssql
 * @requires ../config
 * @requires ../logging/logger
 */

const sql = require('mssql');
const config = require('../config');
const logger = require('../logging/logger');

// ============================================================
// Connection Pool Management
// ============================================================

/** 
 * Singleton pool instance to reuse connections across the application.
 * This improves performance by avoiding repeated connection creation.
 * @type {sql.ConnectionPool|null}
 */
let pool = null;

/**
 * Flag to prevent multiple simultaneous connection attempts.
 * This avoids race conditions when multiple requests try to connect at once.
 * @type {boolean}
 */
let isConnecting = false;

/**
 * Gets or creates a database connection pool.
 * Uses Windows Authentication (integrated security) when no credentials are provided.
 * 
 * @async
 * @function getConnectionPool
 * @returns {Promise<sql.ConnectionPool>} The database connection pool
 * @throws {Error} If connection fails
 * 
 * @example
 * // Get a connection pool
 * const pool = await getConnectionPool();
 * 
 * // Execute a query using the pool
 * const result = await pool.request().query('SELECT * FROM users');
 */
const getConnectionPool = async () => {
    // Return existing pool if already connected
    if (pool) {
        return pool;
    }

    // Wait if another connection attempt is in progress
    if (isConnecting) {
        // Wait 100ms and retry (prevents race conditions)
        await new Promise(resolve => setTimeout(resolve, 100));
        return getConnectionPool();
    }

    // Mark connection attempt in progress
    isConnecting = true;
    
    try {
        // Build database configuration from environment variables
        // All settings come from config/index.js which reads from .env
        const dbConfig = {
            server: config.database.host,              // SQL Server hostname
            port: config.database.port,                // SQL Server port (default: 1433)
            database: config.database.database,        // Database name
            options: config.database.options,          // Connection options (encryption, trust cert, etc.)
            pool: config.database.pool,                // Connection pool settings (min/max connections)
            connectionTimeout: config.database.connectionTimeout || 30000,  // Connection timeout in ms
            requestTimeout: config.database.requestTimeout || 30000,        // Query timeout in ms
        };

        /**
         * Windows Authentication (Integrated Security)
         * If no username/password are provided, the driver uses Windows Authentication.
         * This is the default for development with Windows Active Directory.
         * 
         * For SQL Authentication, provide username/password in .env:
         * DB_USER=sql_user
         * DB_PASSWORD=password
         */
        if (config.database.user && config.database.user !== 'ARC\\NcubeZ') {
            dbConfig.user = config.database.user;
            dbConfig.password = config.database.password;
        }
        // If no user/pass provided, integrated security (Windows Auth) is used

        // Establish the connection pool
        pool = await sql.connect(dbConfig);
        
        // Log successful connection
        logger.info(`Database connection pool established successfully to ${config.database.database}`);

        /**
         * Handle pool errors gracefully
         * If the pool encounters an error, clear the pool reference
         * so a new connection will be created on the next request.
         */
        pool.on('error', (err) => {
            logger.error('Database connection pool error:', err);
            pool = null;  // Reset pool so next request creates a new connection
        });

        return pool;
    } catch (error) {
        // Log the error and re-throw for the caller to handle
        logger.error('Failed to establish database connection:', error);
        throw error;
    } finally {
        // Always clear the connecting flag regardless of success/failure
        isConnecting = false;
    }
};

// ============================================================
// Query Execution Functions
// ============================================================

/**
 * Executes a SQL query with parameters.
 * This is the primary function for executing SELECT, INSERT, UPDATE, DELETE statements.
 * 
 * @async
 * @function executeQuery
 * @param {string} query - The SQL query string with parameter placeholders (e.g., 'SELECT * FROM users WHERE id = @id')
 * @param {Array<{name: string, type?: sql.DataType, value: any}>} params - Array of parameter objects
 * @param {string} params[].name - Parameter name (without the @ symbol)
 * @param {sql.DataType} [params[].type] - Optional SQL Server data type (auto-detected if omitted)
 * @param {any} params[].value - Parameter value
 * @returns {Promise<sql.IResult<any>>} Query result with recordset, rowsAffected, etc.
 * @throws {Error} If query execution fails
 * 
 * @example
 * // Execute a simple query without parameters
 * const result = await executeQuery('SELECT * FROM users WHERE is_active = 1');
 * 
 * // Execute with parameters (prevents SQL injection)
 * const result = await executeQuery(
 *   'SELECT * FROM users WHERE email = @email',
 *   [{ name: 'email', value: 'john@example.com' }]
 * );
 * 
 * // Execute with explicit data type (for GUIDs, dates, etc.)
 * const result = await executeQuery(
 *   'SELECT * FROM persons WHERE person_id = @id',
 *   [{ name: 'id', type: sql.UniqueIdentifier, value: personId }]
 * );
 */
const executeQuery = async (query, params = []) => {
    // Get a connection pool (creates one if needed)
    const pool = await getConnectionPool();
    
    // Create a new request object for this query
    const request = pool.request();

    // Add parameters to the request
    // If type is provided, use it; otherwise, let MSSQL infer the type
    params.forEach(({ name, type, value }) => {
        if (type) {
            request.input(name, type, value);
        } else {
            request.input(name, value);
        }
    });

    try {
        // Execute the query and return results
        const result = await request.query(query);
        return result;
    } catch (error) {
        // Log detailed error information for debugging
        logger.error('Database query error:', { 
            query: query.substring(0, 500),  // Truncate long queries for logging
            error: error.message,
            params: params.map(p => ({ name: p.name, value: p.value }))  // Log parameter values (be careful with sensitive data)
        });
        throw error;
    }
};

// ============================================================
// Stored Procedure Execution
// ============================================================

/**
 * Executes a stored procedure with parameters.
 * Use this for complex business logic that resides in the database.
 * 
 * @async
 * @function executeProcedure
 * @param {string} procedureName - Name of the stored procedure (e.g., 'sp_update_disclosure_status')
 * @param {Array<{name: string, type: sql.DataType, value: any}>} params - Array of parameter objects
 * @param {string} params[].name - Parameter name (without the @ symbol)
 * @param {sql.DataType} params[].type - SQL Server data type (MUST be provided for stored procedures)
 * @param {any} params[].value - Parameter value
 * @returns {Promise<sql.IResult<any>>} Stored procedure result
 * @throws {Error} If stored procedure execution fails
 * 
 * @example
 * // Execute a stored procedure with parameters
 * const result = await executeProcedure('sp_update_disclosure_status', [
 *   { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId },
 *   { name: 'newStatus', value: 'Approved' },
 *   { name: 'reviewerId', type: sql.UniqueIdentifier, value: reviewerId }
 * ]);
 */
const executeProcedure = async (procedureName, params = []) => {
    // Get a connection pool
    const pool = await getConnectionPool();
    
    // Create a new request for the stored procedure
    const request = pool.request();

    // Add parameters - stored procedures require explicit data types
    params.forEach(({ name, type, value }) => {
        // Type is required for stored procedures
        if (!type) {
            throw new Error(`Data type is required for parameter '${name}' in stored procedure '${procedureName}'`);
        }
        request.input(name, type, value);
    });

    try {
        // Execute the stored procedure
        const result = await request.execute(procedureName);
        return result;
    } catch (error) {
        // Log detailed error for debugging
        logger.error('Stored procedure execution error:', { 
            procedureName, 
            error: error.message,
            params: params.map(p => ({ name: p.name, value: p.value }))
        });
        throw error;
    }
};

// ============================================================
// Transaction Management
// ============================================================

/**
 * Executes a callback function within a database transaction.
 * Automatically commits on success or rolls back on error.
 * This ensures data consistency across multiple operations.
 * 
 * @async
 * @function executeTransaction
 * @param {function(sql.Transaction): Promise<any>} callback - Async function that receives a transaction object
 * @returns {Promise<any>} The result of the callback function
 * @throws {Error} If transaction fails (automatically rolls back)
 * 
 * @example
 * // Execute multiple operations in a transaction
 * const result = await executeTransaction(async (transaction) => {
 *   // Insert a person
 *   await transaction.request()
 *     .input('id', sql.UniqueIdentifier, personId)
 *     .query('INSERT INTO persons (person_id, name) VALUES (@id, @name)');
 *   
 *   // Assign a role (in the same transaction)
 *   await transaction.request()
 *     .input('personId', sql.UniqueIdentifier, personId)
 *     .query('INSERT INTO person_roles (person_id, role_id) VALUES (@personId, @roleId)');
 *   
 *   // Return something if needed
 *   return { success: true };
 * });
 */
const executeTransaction = async (callback) => {
    // Get a connection pool
    const pool = await getConnectionPool();
    
    // Create a new transaction object
    const transaction = new sql.Transaction(pool);
    
    try {
        // Begin the transaction
        await transaction.begin();
        
        // Execute the callback with the transaction object
        const result = await callback(transaction);
        
        // Commit if successful
        await transaction.commit();
        
        return result;
    } catch (error) {
        // Roll back on error
        await transaction.rollback();
        
        // Log the error
        logger.error('Transaction failed:', error);
        throw error;
    }
};

/**
 * Gets a transaction object for manual transaction management.
 * Use this if you need more control over the transaction lifecycle.
 * 
 * @async
 * @function getTransaction
 * @returns {Promise<sql.Transaction>} A transaction object
 * @throws {Error} If transaction creation fails
 * 
 * @example
 * // Manual transaction management
 * const transaction = await getTransaction();
 * try {
 *   await transaction.request().query('UPDATE users SET active = 1 WHERE id = @id');
 *   await transaction.commit();
 * } catch (error) {
 *   await transaction.rollback();
 *   throw error;
 * }
 */
const getTransaction = async () => {
    // Get a connection pool
    const pool = await getConnectionPool();
    
    // Create and begin a transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    return transaction;
};

// ============================================================
// Connection Cleanup
// ============================================================

/**
 * Closes the database connection pool.
 * Should be called when shutting down the application.
 * 
 * @async
 * @function closeConnection
 * @returns {Promise<void>}
 * 
 * @example
 * // Graceful shutdown
 * process.on('SIGTERM', async () => {
 *   await closeConnection();
 *   process.exit(0);
 * });
 */
const closeConnection = async () => {
    // Only close if a pool exists
    if (pool) {
        await pool.close();
        pool = null;  // Reset pool reference
        logger.info('Database connection pool closed');
    }
};

// ============================================================
// Module Exports
// ============================================================

/**
 * Exports the core database functions and the sql namespace.
 * The sql namespace provides access to SQL Server data types.
 */
module.exports = {
    getConnectionPool,    // Get or create connection pool
    executeQuery,         // Execute SQL query with parameters
    executeProcedure,     // Execute stored procedure
    executeTransaction,   // Execute operations in a transaction
    getTransaction,       // Get manual transaction object
    closeConnection,      // Close connection pool
    sql,                  // MSSQL namespace with data types (e.g., sql.UniqueIdentifier)
};