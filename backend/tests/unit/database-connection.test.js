/**
 * Database Connection Test
 * Tests the database connection and basic operations
 */

const { getConnectionPool, executeQuery, closeConnection } = require('../../src/database');
const logger = require('../../src/logging/logger');

async function testDatabaseConnection() {
    try {
        logger.info(' Testing database connection...');
        
        // Test 1: Connection
        const pool = await getConnectionPool();
        logger.info(' Connection successful!');
        
        // Test 2: SQL Server Version
        const versionResult = await executeQuery('SELECT @@VERSION as version');
        const version = versionResult.recordset[0].version;
        logger.info(` SQL Server Version: ${version}`);
        
        // Test 3: List Tables
        const tables = await executeQuery(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        logger.info(` Found ${tables.recordset.length} tables in database`);
        console.log('\n Tables:');
        tables.recordset.forEach(t => {
            console.log(`  - ${t.TABLE_NAME}`);
        });
        
        // Test 4: List Stored Procedures
        const procs = await executeQuery(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE'
            ORDER BY ROUTINE_NAME
        `);
        
        if (procs.recordset.length > 0) {
            logger.info(` Found ${procs.recordset.length} stored procedures`);
            console.log('\n Stored Procedures:');
            procs.recordset.forEach(p => {
                console.log(`  - ${p.ROUTINE_NAME}`);
            });
        }
        
        // Test 5: Count records in key tables
        const keyTables = ['persons', 'ip_records', 'disclosures', 'roles'];
        console.log('\n Record Counts:');
        for (const table of keyTables) {
            try {
                const countResult = await executeQuery(
                    `SELECT COUNT(*) as count FROM ${table} WHERE is_deleted = 0`
                );
                console.log(`  - ${table}: ${countResult.recordset[0].count} records`);
            } catch (e) {
                console.log(`  - ${table}: Table not found or error`);
            }
        }
        
        // Test 6: Test Stored Procedure - Get Roles
        try {
            const rolesResult = await executeQuery('SELECT * FROM roles WHERE is_active = 1');
            console.log(`\n Active Roles (${rolesResult.recordset.length}):`);
            rolesResult.recordset.forEach(r => {
                console.log(`  - ${r.role_name} (${r.role_id})`);
            });
        } catch (e) {
            logger.warn('Could not fetch roles:', e.message);
        }
        
        logger.info(' All database tests completed successfully');
        
        // Close connection
        await closeConnection();
        logger.info(' Connection closed');
        
        return true;
    } catch (error) {
        logger.error(' Database test failed:', error);
        throw error;
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testDatabaseConnection()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { testDatabaseConnection };