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

let pool = null;
let isConnecting = false;

const getConnectionPool = async () => {
    if (pool) {
        return pool;
    }

    if (isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return getConnectionPool();
    }

    isConnecting = true;
    
    try {
        // Use the tedious driver directly for better Windows Auth support
        const { Connection } = require('tedious');
        
        const dbConfig = {
            server: config.database.host,
            port: config.database.port,
            database: config.database.database,
            options: {
                encrypt: config.database.options.encrypt || false,
                trustServerCertificate: config.database.options.trustServerCertificate || true,
                enableArithAbort: true,
                // Use integrated security for Windows Auth
                // This is the key setting for Windows Authentication
                trustedConnection: true,
                // Use the Windows authentication library
                useWindows: true,
            },
            pool: {
                max: config.database.pool.max || 10,
                min: config.database.pool.min || 0,
                idleTimeoutMillis: config.database.pool.idleTimeoutMillis || 30000,
            },
            connectionTimeout: config.database.connectionTimeout || 30000,
            requestTimeout: config.database.requestTimeout || 30000,
        };

        // Only add user/password if they exist and are not empty (SQL Auth)
        const hasUser = config.database.user && config.database.user.trim() !== '';
        if (hasUser) {
            dbConfig.user = config.database.user;
            dbConfig.password = config.database.password || '';
            // Disable Windows Auth if using SQL Auth
            dbConfig.options.trustedConnection = false;
            dbConfig.options.useWindows = false;
            console.log('🔑 Using SQL Authentication with user:', config.database.user);
        } else {
            console.log('🪟 Using Windows Authentication (Integrated Security)');
            console.log('   Server:', config.database.host);
            console.log('   Database:', config.database.database);
        }

        console.log('📡 Connecting to SQL Server...');

        // Establish the connection pool
        pool = await sql.connect(dbConfig);
        
        logger.info(`Database connection pool established successfully to ${config.database.database}`);

        pool.on('error', (err) => {
            logger.error('Database connection pool error:', err);
            pool = null;
        });

        return pool;
    } catch (error) {
        logger.error('Failed to establish database connection:', error);
        throw error;
    } finally {
        isConnecting = false;
    }
};

const executeQuery = async (query, params = []) => {
    const pool = await getConnectionPool();
    const request = pool.request();

    params.forEach(({ name, type, value }) => {
        if (type) {
            request.input(name, type, value);
        } else {
            request.input(name, value);
        }
    });

    try {
        const result = await request.query(query);
        return result;
    } catch (error) {
        logger.error('Database query error:', { 
            query: query.substring(0, 500),
            error: error.message
        });
        throw error;
    }
};

const executeProcedure = async (procedureName, params = []) => {
    const pool = await getConnectionPool();
    const request = pool.request();

    params.forEach(({ name, type, value }) => {
        if (!type) {
            throw new Error(`Data type is required for parameter '${name}' in stored procedure '${procedureName}'`);
        }
        request.input(name, type, value);
    });

    try {
        const result = await request.execute(procedureName);
        return result;
    } catch (error) {
        logger.error('Stored procedure execution error:', { 
            procedureName, 
            error: error.message
        });
        throw error;
    }
};

const executeTransaction = async (callback) => {
    const pool = await getConnectionPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        const result = await callback(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        logger.error('Transaction failed:', error);
        throw error;
    }
};

const getTransaction = async () => {
    const pool = await getConnectionPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    return transaction;
};

const closeConnection = async () => {
    if (pool) {
        await pool.close();
        pool = null;
        logger.info('Database connection pool closed');
    }
};

module.exports = {
    getConnectionPool,
    executeQuery,
    executeProcedure,
    executeTransaction,
    getTransaction,
    closeConnection,
    sql,
};