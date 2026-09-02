// src/database/repositories/trademark.repository.js
/**
 * Trademark Repository
 * ====================
 * Manages database operations for trademark records.
 * Handles trademark-specific data including:
 * - Trademark details (name, logo, slogan)
 * - Classes and goods/services
 * - Jurisdictions and territories
 * - Registration and expiry dates
 * - Trademark status and lifecycle
 * - Renewal tracking
 * 
 * @module repositories/trademark.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * TrademarkRepository class for managing trademark records.
 * Extends BaseRepository with trademark-specific operations.
 * 
 * @class TrademarkRepository
 * @extends BaseRepository
 */
class TrademarkRepository extends BaseRepository {
    /**
     * Creates an instance of TrademarkRepository.
     * Initializes with the 'trademark_records' table and 'trademark_id' as primary key.
     */
    constructor() {
        super('trademark_records', 'trademark_id');
    }

    /**
     * Finds a complete trademark record with all related data.
     * 
     * @async
     * @param {string} id - Trademark UUID
     * @returns {Promise<Object|null>} Complete trademark object
     */
    async findFullTrademark(id) {
        if (!id) {
            throw new Error('Trademark ID is required');
        }

        const query = `
            SELECT 
                tm.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                td.trademark_details_id,
                td.trademark_name,
                td.logo_url,
                td.slogan,
                td.goods_services,
                (
                    SELECT 
                        tc.class_id,
                        tc.class_number,
                        tc.class_description,
                        tc.goods_services_list
                    FROM trademark_classes tc
                    WHERE tc.trademark_id = tm.trademark_id
                    FOR JSON PATH
                ) as classes,
                (
                    SELECT 
                        tj.jurisdiction_id,
                        tj.jurisdiction_code,
                        tj.jurisdiction_name,
                        tj.registration_date,
                        tj.expiry_date,
                        tj.status as jurisdiction_status,
                        tj.renewal_due_date
                    FROM trademark_jurisdictions tj
                    WHERE tj.trademark_id = tm.trademark_id
                    FOR JSON PATH
                ) as jurisdictions,
                (
                    SELECT 
                        trn.renewal_id,
                        trn.renewal_date,
                        trn.renewal_due_date,
                        trn.renewal_status,
                        trn.amount_paid,
                        trn.payment_reference
                    FROM trademark_renewals trn
                    WHERE trn.trademark_id = tm.trademark_id
                    ORDER BY trn.renewal_due_date DESC
                    FOR JSON PATH
                ) as renewals
            FROM trademark_records tm
            JOIN ip_records ir ON tm.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            WHERE tm.trademark_id = @id AND tm.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const trademark = result.recordset[0];
        
        if (trademark.classes) {
            trademark.classes = JSON.parse(trademark.classes);
        }
        if (trademark.jurisdictions) {
            trademark.jurisdictions = JSON.parse(trademark.jurisdictions);
        }
        if (trademark.renewals) {
            trademark.renewals = JSON.parse(trademark.renewals);
        }

        return trademark;
    }

    /**
     * Finds trademarks by owner.
     * 
     * @async
     * @param {string} personId - Owner UUID
     * @returns {Promise<Array>} Array of trademarks
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                tm.*,
                ir.reference_number,
                td.trademark_name,
                td.slogan
            FROM trademark_records tm
            JOIN ip_records ir ON tm.ip_record_id = ir.ip_record_id
            LEFT JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            WHERE ir.owner_id = @personId AND tm.is_deleted = 0
            ORDER BY tm.filing_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets trademarks by class number.
     * 
     * @async
     * @param {number} classNumber - Nice Classification number
     * @returns {Promise<Array>} Array of trademarks
     */
    async findByClass(classNumber) {
        if (!classNumber) {
            throw new Error('Class number is required');
        }

        const query = `
            SELECT 
                tm.trademark_id,
                tm.registration_number,
                tm.filing_date,
                tm.registration_date,
                td.trademark_name,
                td.trademark_type,
                ir.reference_number
            FROM trademark_records tm
            JOIN ip_records ir ON tm.ip_record_id = ir.ip_record_id
            JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            JOIN trademark_classes tc ON tc.trademark_id = tm.trademark_id
            WHERE tc.class_number = @classNumber AND tm.is_deleted = 0
            ORDER BY tm.filing_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'classNumber', value: classNumber }
        ]);

        return result.recordset;
    }

    /**
     * Gets trademark statistics.
     * 
     * @async
     * @returns {Promise<Object>} Trademark statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_trademarks,
                COUNT(CASE WHEN tm.status = 'Applied' THEN 1 END) as applied,
                COUNT(CASE WHEN tm.status = 'Under Examination' THEN 1 END) as under_examination,
                COUNT(CASE WHEN tm.status = 'Published' THEN 1 END) as published,
                COUNT(CASE WHEN tm.status = 'Registered' THEN 1 END) as registered,
                COUNT(CASE WHEN tm.status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN tm.status = 'Expired' THEN 1 END) as expired,
                COUNT(CASE WHEN tm.status = 'Abandoned' THEN 1 END) as abandoned,
                COUNT(DISTINCT td.trademark_type) as trademark_types
            FROM trademark_records tm
            LEFT JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            WHERE tm.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Searches trademarks by name or registration number.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of trademarks
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                tm.trademark_id,
                tm.registration_number,
                tm.filing_date,
                tm.registration_date,
                tm.status,
                td.trademark_name,
                td.trademark_type,
                td.slogan,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                COUNT(DISTINCT tc.class_number) as class_count
            FROM trademark_records tm
            JOIN ip_records ir ON tm.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            LEFT JOIN trademark_classes tc ON tc.trademark_id = tm.trademark_id
            WHERE tm.is_deleted = 0
            AND (
                td.trademark_name LIKE @searchTerm
                OR tm.registration_number LIKE @searchTerm
                OR td.slogan LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            GROUP BY tm.trademark_id, tm.registration_number, tm.filing_date, tm.registration_date,
                     tm.status, td.trademark_name, td.trademark_type, td.slogan,
                     ir.reference_number, p.first_name, p.last_name
            ORDER BY tm.filing_date DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Updates trademark status.
     * 
     * @async
     * @param {string} trademarkId - Trademark UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated trademark
     */
    async updateStatus(trademarkId, status, updatedBy, metadata = null) {
        if (!trademarkId || !status) {
            throw new Error('Trademark ID and status are required');
        }

        let query = `
            UPDATE trademark_records
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'trademarkId', type: sql.UniqueIdentifier, value: trademarkId },
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

        query += ` WHERE trademark_id = @trademarkId`;

        await executeQuery(query, params);

        logger.info('Trademark status updated', { trademarkId, status, updatedBy });
        return this.findById(trademarkId);
    }

    /**
     * Records a trademark renewal.
     * 
     * @async
     * @param {string} trademarkId - Trademark UUID
     * @param {Object} renewalData - Renewal data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated trademark
     */
    async recordRenewal(trademarkId, renewalData, updatedBy) {
        if (!trademarkId || !renewalData) {
            throw new Error('Trademark ID and renewal data are required');
        }

        const insertQuery = `
            INSERT INTO trademark_renewals (
                renewal_id,
                trademark_id,
                renewal_date,
                renewal_due_date,
                renewal_status,
                amount_paid,
                payment_reference,
                created_by,
                created_at
            ) VALUES (
                @renewalId,
                @trademarkId,
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
            { name: 'trademarkId', type: sql.UniqueIdentifier, value: trademarkId },
            { name: 'renewalDate', value: renewalData.renewalDate || new Date() },
            { name: 'renewalDueDate', value: renewalData.renewalDueDate },
            { name: 'amountPaid', value: renewalData.amountPaid || 0 },
            { name: 'paymentReference', value: renewalData.paymentReference || null },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.info('Trademark renewal recorded', { trademarkId, renewalId, updatedBy });
        return this.findById(trademarkId);
    }

    /**
     * Gets trademarks by registration number.
     * 
     * @async
     * @param {string} registrationNumber - Trademark registration number
     * @returns {Promise<Object|null>} Trademark object
     */
    async findByRegistrationNumber(registrationNumber) {
        if (!registrationNumber) {
            throw new Error('Registration number is required');
        }

        const query = `
            SELECT * FROM trademark_records 
            WHERE registration_number = @registrationNumber AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'registrationNumber', value: registrationNumber }
        ]);

        return result.recordset[0] || null;
    }
}

module.exports = new TrademarkRepository();