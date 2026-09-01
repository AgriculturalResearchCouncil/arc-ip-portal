/**
 * Test Helpers
 * ============
 * Utility functions for testing the application.
 * Provides helper functions for:
 * - Creating test data
 * - Cleaning up test data
 * - Authentication helpers
 * - Database helpers
 * 
 * @module tests/helpers/test-helpers
 */

const { v4: uuidv4 } = require('uuid');
const { executeQuery, sql } = require('../../src/database');
const personRepository = require('../../src/database/repositories/person.repository');

/**
 * Creates a test user in the database.
 * 
 * @param {Object} data - User data
 * @param {string} [data.personId] - Optional UUID
 * @param {string} [data.firstName='Test'] - First name
 * @param {string} [data.lastName='User'] - Last name
 * @param {string} [data.email] - Email (auto-generated if not provided)
 * @param {string} [data.employeeNumber] - Employee number
 * @param {string} [data.role] - Role to assign
 * @returns {Promise<Object>} Created user object
 */
const createTestUser = async (data = {}) => {
    const personId = data.personId || uuidv4();
    const firstName = data.firstName || 'Test';
    const lastName = data.lastName || 'User';
    const email = data.email || `test-${Date.now()}@example.com`;
    const employeeNumber = data.employeeNumber || `EMP${Date.now()}`;
    
    const query = `
        INSERT INTO persons (
            person_id, first_name, last_name, email, 
            employee_number, active, created_at, is_deleted
        ) VALUES (
            @personId, @firstName, @lastName, @email,
            @employeeNumber, 1, GETDATE(), 0
        )
    `;
    
    await executeQuery(query, [
        { name: 'personId', type: sql.UniqueIdentifier, value: personId },
        { name: 'firstName', value: firstName },
        { name: 'lastName', value: lastName },
        { name: 'email', value: email },
        { name: 'employeeNumber', value: employeeNumber },
    ]);
    
    // Assign role if specified
    if (data.role) {
        try {
            const roleQuery = `
                SELECT role_id FROM roles WHERE role_name = @roleName AND is_active = 1
            `;
            const roleResult = await executeQuery(roleQuery, [
                { name: 'roleName', value: data.role }
            ]);
            
            if (roleResult.recordset.length > 0) {
                const roleId = roleResult.recordset[0].role_id;
                const personRoleId = uuidv4();
                
                const insertRoleQuery = `
                    INSERT INTO person_roles (person_role_id, person_id, role_id, created_at, is_active)
                    VALUES (@personRoleId, @personId, @roleId, GETDATE(), 1)
                `;
                
                await executeQuery(insertRoleQuery, [
                    { name: 'personRoleId', type: sql.UniqueIdentifier, value: personRoleId },
                    { name: 'personId', type: sql.UniqueIdentifier, value: personId },
                    { name: 'roleId', type: sql.UniqueIdentifier, value: roleId },
                ]);
            }
        } catch (error) {
            console.log('Could not assign role:', error.message);
        }
    }
    
    return { person_id: personId, firstName, lastName, email };
};

/**
 * Deletes a test user from the database.
 * 
 * @param {string} personId - User UUID
 * @returns {Promise<boolean>} True if successful
 */
const deleteTestUser = async (personId) => {
    try {
        // Delete person roles first
        await executeQuery(
            `DELETE FROM person_roles WHERE person_id = @personId`,
            [{ name: 'personId', type: sql.UniqueIdentifier, value: personId }]
        );
        
        // Delete person
        await executeQuery(
            `DELETE FROM persons WHERE person_id = @personId`,
            [{ name: 'personId', type: sql.UniqueIdentifier, value: personId }]
        );
        
        return true;
    } catch (error) {
        console.log('Failed to delete user:', error.message);
        return false;
    }
};

/**
 * Creates a test IP record in the database.
 * 
 * @param {Object} data - IP record data
 * @param {string} [data.ipRecordId] - Optional UUID
 * @param {string} [data.referenceNumber] - Reference number
 * @param {string} [data.title='Test IP Record'] - Title
 * @param {string} [data.ownerId] - Owner UUID
 * @param {string} [data.recordType='Disclosure'] - Record type
 * @param {string} [data.status='Draft'] - Status
 * @returns {Promise<Object>} Created IP record
 */
const createTestIpRecord = async (data = {}) => {
    const ipRecordId = data.ipRecordId || uuidv4();
    const referenceNumber = data.referenceNumber || `TEST-${Date.now()}`;
    const title = data.title || 'Test IP Record';
    const ownerId = data.ownerId || (await createTestUser()).person_id;
    
    const query = `
        INSERT INTO ip_records (
            ip_record_id, reference_number, record_type, title,
            description, owner_id, status, confidentiality_level,
            created_by, created_at, is_deleted
        ) VALUES (
            @ipRecordId, @referenceNumber, @recordType, @title,
            @description, @ownerId, @status, @confidentialityLevel,
            @createdBy, GETDATE(), 0
        )
    `;
    
    await executeQuery(query, [
        { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
        { name: 'referenceNumber', value: referenceNumber },
        { name: 'recordType', value: data.recordType || 'Disclosure' },
        { name: 'title', value: title },
        { name: 'description', value: data.description || 'Test description' },
        { name: 'ownerId', type: sql.UniqueIdentifier, value: ownerId },
        { name: 'status', value: data.status || 'Draft' },
        { name: 'confidentialityLevel', value: data.confidentialityLevel || 'Confidential' },
        { name: 'createdBy', type: sql.UniqueIdentifier, value: data.createdBy || ownerId },
    ]);
    
    return { ip_record_id: ipRecordId, referenceNumber, title, ownerId };
};

/**
 * Creates a test disclosure in the database.
 * 
 * @param {Object} data - Disclosure data
 * @param {string} [data.disclosureId] - Optional UUID
 * @param {string} [data.ipRecordId] - IP record UUID
 * @param {string} [data.title='Test Disclosure'] - Title
 * @param {string} [data.disclosureCategory='Innovation'] - Category
 * @param {string} [data.reviewStatus='Draft'] - Review status
 * @returns {Promise<Object>} Created disclosure
 */
const createTestDisclosure = async (data = {}) => {
    const disclosureId = data.disclosureId || uuidv4();
    const ipRecordId = data.ipRecordId || (await createTestIpRecord()).ip_record_id;
    const title = data.title || 'Test Disclosure';
    
    const query = `
        INSERT INTO disclosures (
            disclosure_id, ip_record_id, title, disclosure_date,
            disclosure_category, novelty_description,
            commercialisation_potential, review_status,
            created_at, is_deleted
        ) VALUES (
            @disclosureId, @ipRecordId, @title, @disclosureDate,
            @disclosureCategory, @noveltyDescription,
            @commercialisationPotential, @reviewStatus,
            GETDATE(), 0
        )
    `;
    
    await executeQuery(query, [
        { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId },
        { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
        { name: 'title', value: title },
        { name: 'disclosureDate', value: data.disclosureDate || new Date() },
        { name: 'disclosureCategory', value: data.disclosureCategory || 'Innovation' },
        { name: 'noveltyDescription', value: data.noveltyDescription || 'Test novelty description' },
        { name: 'commercialisationPotential', value: data.commercialisationPotential || 'High potential' },
        { name: 'reviewStatus', value: data.reviewStatus || 'Draft' },
    ]);
    
    return { disclosure_id: disclosureId, ip_record_id: ipRecordId, title };
};

/**
 * Cleans up test data from the database.
 * 
 * @param {Array} records - Array of records to clean up
 * @param {string} records[].type - Record type ('person', 'ip_record', 'disclosure')
 * @param {string} records[].id - Record ID
 * @returns {Promise<boolean>} True if successful
 */
const cleanupTestData = async (records) => {
    let success = true;
    
    for (const record of records) {
        try {
            if (record.type === 'person') {
                await deleteTestUser(record.id);
            } else if (record.type === 'ip_record') {
                await executeQuery(
                    `DELETE FROM ip_records WHERE ip_record_id = @id`,
                    [{ name: 'id', type: sql.UniqueIdentifier, value: record.id }]
                );
            } else if (record.type === 'disclosure') {
                await executeQuery(
                    `DELETE FROM disclosures WHERE disclosure_id = @id`,
                    [{ name: 'id', type: sql.UniqueIdentifier, value: record.id }]
                );
            }
        } catch (error) {
            console.log(`Failed to clean up ${record.type}:`, error.message);
            success = false;
        }
    }
    
    return success;
};

/**
 * Generates a mock authentication token for testing.
 * 
 * @param {Object} user - User object
 * @param {string} user.person_id - User UUID
 * @param {string} user.role - User role
 * @returns {string} Mock JWT token
 */
const generateMockToken = (user) => {
    // This is a mock token for testing purposes only
    const payload = {
        person_id: user.person_id,
        role: user.role,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    // Base64 encode the payload (mock token)
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `Bearer mock-token-${token}`;
};

module.exports = {
    createTestUser,
    deleteTestUser,
    createTestIpRecord,
    createTestDisclosure,
    cleanupTestData,
    generateMockToken
};