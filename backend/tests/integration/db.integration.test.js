/**
 * Database Integration Tests
 * Uses Jest for testing database operations
 */

const { getConnectionPool, executeQuery, executeTransaction, closeConnection } = require('../../src/database');
const { v4: uuidv4 } = require('uuid');

describe('Database Integration Tests', () => {
    let pool;
    
    beforeAll(async () => {
        pool = await getConnectionPool();
    });
    
    afterAll(async () => {
        await closeConnection();
    });
    
    test('should connect to database successfully', async () => {
        expect(pool).toBeDefined();
        expect(pool.connected).toBeTruthy();
    });
    
    test('should execute a simple query', async () => {
        const result = await executeQuery('SELECT @@VERSION as version');
        expect(result.recordset).toBeDefined();
        expect(result.recordset[0].version).toContain('Microsoft SQL Server');
    });
    
    test('should get list of tables', async () => {
        const result = await executeQuery(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        expect(result.recordset.length).toBeGreaterThan(0);
        expect(result.recordset.some(r => r.TABLE_NAME === 'persons')).toBeTruthy();
        expect(result.recordset.some(r => r.TABLE_NAME === 'ip_records')).toBeTruthy();
    });
    
    test('should execute a transaction successfully', async () => {
        const testId = uuidv4();
        const tableName = 'persons';
        
        // Check if table exists
        const tableCheck = await executeQuery(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = @tableName
        `, [{ name: 'tableName', value: tableName }]);
        
        if (tableCheck.recordset[0].count === 0) {
            console.log('Skipping transaction test - table not found');
            return;
        }
        
        const result = await executeTransaction(async (transaction) => {
            // Insert a test record
            const insertQuery = `
                INSERT INTO ${tableName} (person_id, first_name, last_name, email, is_deleted)
                VALUES (@id, @firstName, @lastName, @email, 0)
            `;
            
            await transaction.request()
                .input('id', sql.UniqueIdentifier, testId)
                .input('firstName', sql.NVarChar, 'Test')
                .input('lastName', sql.NVarChar, 'User')
                .input('email', sql.NVarChar, `test-${testId}@example.com`)
                .query(insertQuery);
            
            // Verify it was inserted
            const selectQuery = `
                SELECT * FROM ${tableName} 
                WHERE person_id = @id AND is_deleted = 0
            `;
            const result = await transaction.request()
                .input('id', sql.UniqueIdentifier, testId)
                .query(selectQuery);
            
            // Clean up - delete the test record
            const deleteQuery = `
                DELETE FROM ${tableName} 
                WHERE person_id = @id
            `;
            await transaction.request()
                .input('id', sql.UniqueIdentifier, testId)
                .query(deleteQuery);
            
            return result.recordset[0];
        });
        
        expect(result).toBeDefined();
        expect(result.first_name).toBe('Test');
        expect(result.last_name).toBe('User');
    });
    
    test('should handle stored procedures', async () => {
        // Check if stored procedure exists
        const procCheck = await executeQuery(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE'
            AND ROUTINE_NAME = 'sp_update_disclosure_status'
        `);
        
        if (procCheck.recordset[0].count > 0) {
            // Test stored procedure execution
            try {
                const result = await executeProcedure('sp_update_disclosure_status', [
                    { name: 'disclosureId', type: sql.UniqueIdentifier, value: uuidv4() },
                    { name: 'newStatus', value: 'Test' },
                    { name: 'reviewerId', type: sql.UniqueIdentifier, value: uuidv4() },
                ]);
                // Even if it fails with not found, it should execute without error
                expect(result).toBeDefined();
            } catch (error) {
                // Expected to fail if test IDs don't exist
                expect(error.message).toContain('disclosure');
            }
        } else {
            console.log('Stored procedure sp_update_disclosure_status not found - skipping test');
        }
    });
});