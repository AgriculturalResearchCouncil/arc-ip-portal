// src/database/repositories/design.repository.js
/**
 * Design Repository
 * =================
 * Manages database operations for design records.
 * Handles design-specific data including:
 * - Design details (name, description, features)
 * - Design registration and expiry dates
 * - Design status and lifecycle
 * - Design renewals
 * - Jurisdictions
 * 
 * @module repositories/design.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * DesignRepository class for managing design records.
 * Extends BaseRepository with design-specific operations.
 * 
 * @class DesignRepository
 * @extends BaseRepository
 */
class DesignRepository extends BaseRepository {
    /**
     * Creates an instance of DesignRepository.
     * Initializes with the 'design_records' table and 'design_id' as primary key.
     */
    constructor() {
        super('design_records', 'design_id');
    }

    /**
     * Finds a complete design record with all related data.
     * 
     * @async
     * @param {string} id - Design UUID
     * @returns {Promise<Object|null>} Complete design object
     */
    async findFullDesign(id) {
        if (!id) {
            throw new Error('Design ID is required');
        }

        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                dd.design_details_id,
                dd.design_name,
                dd.design_description,
                dd.design_features,
                dd.design_type,
                (
                    SELECT 
                        dj.jurisdiction_id,
                        dj.jurisdiction_code,
                        dj.jurisdiction_name,
                        dj.registration_date,
                        dj.expiry_date,
                        dj.status as jurisdiction_status,
                        dj.renewal_due_date
                    FROM design_jurisdictions dj
                    WHERE dj.design_id = d.design_id
                    FOR JSON PATH
                ) as jurisdictions,
                (
                    SELECT 
                        drn.renewal_id,
                        drn.renewal_date,
                        drn.renewal_due_date,
                        drn.renewal_status,
                        drn.amount_paid,
                        drn.payment_reference
                    FROM design_renewals drn
                    WHERE drn.design_id = d.design_id
                    ORDER BY drn.renewal_due_date DESC
                    FOR JSON PATH
                ) as renewals
            FROM design_records d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN design_details dd ON d.design_details_id = dd.design_details_id
            WHERE d.design_id = @id AND d.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const design = result.recordset[0];
        
        if (design.jurisdictions) {
            design.jurisdictions = JSON.parse(design.jurisdictions);
        }
        if (design.renewals) {
            design.renewals = JSON.parse(design.renewals);
        }

        return design;
    }

    /**
     * Finds designs by owner.
     * 
     * @async
     * @param {string} personId - Owner UUID
     * @returns {Promise<Array>} Array of designs
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                dd.design_name,
                dd.design_type
            FROM design_records d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN design_details dd ON d.design_details_id = dd.design_details_id
            WHERE ir.owner_id = @personId AND d.is_deleted = 0
            ORDER BY d.registration_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets designs by design type.
     * 
     * @async
     * @param {string} designType - Type of design
     * @returns {Promise<Array>} Array of designs
     */
    async findByType(designType) {
        if (!designType) {
            throw new Error('Design type is required');
        }

        const query = `
            SELECT 
                d.design_id,
                d.registration_number,
                d.registration_date,
                dd.design_name,
                dd.design_description,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name
            FROM design_records d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            JOIN design_details dd ON d.design_details_id = dd.design_details_id
            WHERE dd.design_type = @designType AND d.is_deleted = 0
            ORDER BY d.registration_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'designType', value: designType }
        ]);

        return result.recordset;
    }

    /**
     * Gets design statistics.
     * 
     * @async
     * @returns {Promise<Object>} Design statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_designs,
                COUNT(CASE WHEN d.status = 'Registered' THEN 1 END) as registered,
                COUNT(CASE WHEN d.status = 'Pending' THEN 1 END) as pending,
                COUNT(CASE WHEN d.status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN d.status = 'Expired' THEN 1 END) as expired,
                COUNT(DISTINCT dd.design_type) as design_types
            FROM design_records d
            LEFT JOIN design_details dd ON d.design_details_id = dd.design_details_id
            WHERE d.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Searches designs by name or registration number.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of designs
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                d.design_id,
                d.registration_number,
                d.registration_date,
                d.status,
                dd.design_name,
                dd.design_description,
                dd.design_type,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name
            FROM design_records d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN design_details dd ON d.design_details_id = dd.design_details_id
            WHERE d.is_deleted = 0
            AND (
                dd.design_name LIKE @searchTerm
                OR d.registration_number LIKE @searchTerm
                OR dd.design_description LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY d.registration_date DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Updates design status.
     * 
     * @async
     * @param {string} designId - Design UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated design
     */
    async updateStatus(designId, status, updatedBy, metadata = null) {
        if (!designId || !status) {
            throw new Error('Design ID and status are required');
        }

        let query = `
            UPDATE design_records
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'designId', type: sql.UniqueIdentifier, value: designId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (status === 'Registered') {
            query += `, registration_date = GETDATE()`;
        }

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE design_id = @designId`;

        await executeQuery(query, params);

        logger.info('Design status updated', { designId, status, updatedBy });
        return this.findById(designId);
    }

    /**
     * Records a design renewal.
     * 
     * @async
     * @param {string} designId - Design UUID
     * @param {Object} renewalData - Renewal data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated design
     */
    async recordRenewal(designId, renewalData, updatedBy) {
        if (!designId || !renewalData) {
            throw new Error('Design ID and renewal data are required');
        }

        const insertQuery = `
            INSERT INTO design_renewals (
                renewal_id,
                design_id,
                renewal_date,
                renewal_due_date,
                renewal_status,
                amount_paid,
                payment_reference,
                created_by,
                created_at
            ) VALUES (
                @renewalId,
                @designId,
                @renewalDate,
                @renewalDueDate,
                'Completed',
                @amountPaid,
                @paymentReference,
                @createdBy,
                GETDATE()
            )
        `;

        const renewalId = this.generateId();
        await executeQuery(insertQuery, [
            { name: 'renewalId', type: sql.UniqueIdentifier, value: renewalId },
            { name: 'designId', type: sql.UniqueIdentifier, value: designId },
            { name: 'renewalDate', value: renewalData.renewalDate || new Date() },
            { name: 'renewalDueDate', value: renewalData.renewalDueDate },
            { name: 'amountPaid', value: renewalData.amountPaid || 0 },
            { name: 'paymentReference', value: renewalData.paymentReference || null },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.info('Design renewal recorded', { designId, renewalId, updatedBy });
        return this.findById(designId);
    }

    /**
     * Gets design by registration number.
     * 
     * @async
     * @param {string} registrationNumber - Design registration number
     * @returns {Promise<Object|null>} Design object
     */
    async findByRegistrationNumber(registrationNumber) {
        if (!registrationNumber) {
            throw new Error('Registration number is required');
        }

        const query = `
            SELECT * FROM design_records 
            WHERE registration_number = @registrationNumber AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'registrationNumber', value: registrationNumber }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets designs expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=180] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of designs expiring soon
     */
    async getExpiringSoon(daysThreshold = 180) {
        const query = `
            SELECT 
                d.design_id,
                d.registration_number,
                d.expiry_date,
                DATEDIFF(day, GETDATE(), d.expiry_date) as days_until_expiry,
                dd.design_name,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM design_records d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN design_details dd ON d.design_details_id = dd.design_details_id
            WHERE d.is_deleted = 0
            AND d.status = 'Registered'
            AND d.expiry_date IS NOT NULL
            AND d.expiry_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY d.expiry_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }
}

module.exports = new DesignRepository();