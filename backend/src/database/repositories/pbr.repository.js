// src/database/repositories/pbr.repository.js
/**
 * PBR Repository
 * ==============
 * Manages database operations for Plant Breeders' Rights records.
 * Handles PBR-specific data including:
 * - Plant variety details
 * - Breeder information
 * - PBR application and grant dates
 * - Variety characteristics
 * - PBR status and lifecycle
 * - Renewal tracking
 * 
 * @module repositories/pbr.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * PbrRepository class for managing Plant Breeders' Rights records.
 * Extends BaseRepository with PBR-specific operations.
 * 
 * @class PbrRepository
 * @extends BaseRepository
 */
class PbrRepository extends BaseRepository {
    /**
     * Creates an instance of PbrRepository.
     * Initializes with the 'pbr_records' table and 'pbr_id' as primary key.
     */
    constructor() {
        super('pbr_records', 'pbr_id');
    }

    /**
     * Finds a complete PBR record with all related data.
     * Includes IP record, plant variety details, jurisdictions, and renewal history.
     * 
     * @async
     * @param {string} id - PBR UUID
     * @returns {Promise<Object|null>} Complete PBR object
     */
    async findFullPbr(id) {
        if (!id) {
            throw new Error('PBR ID is required');
        }

        const query = `
            SELECT 
                pbr.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                v.variety_id,
                v.variety_name,
                v.species,
                v.genus,
                v.common_name,
                v.characteristics,
                v.breeding_history,
                (
                    SELECT 
                        pj.jurisdiction_id,
                        pj.jurisdiction_code,
                        pj.jurisdiction_name,
                        pj.application_date,
                        pj.grant_date,
                        pj.expiry_date,
                        pj.status as jurisdiction_status
                    FROM pbr_jurisdictions pj
                    WHERE pj.pbr_id = pbr.pbr_id
                    FOR JSON PATH
                ) as jurisdictions,
                (
                    SELECT 
                        prn.renewal_id,
                        prn.renewal_date,
                        prn.renewal_due_date,
                        prn.renewal_status,
                        prn.amount_paid,
                        prn.payment_reference
                    FROM pbr_renewals prn
                    WHERE prn.pbr_id = pbr.pbr_id
                    ORDER BY prn.renewal_due_date DESC
                    FOR JSON PATH
                ) as renewals
            FROM pbr_records pbr
            JOIN ip_records ir ON pbr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN varieties v ON pbr.variety_id = v.variety_id
            WHERE pbr.pbr_id = @id AND pbr.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const pbr = result.recordset[0];
        
        if (pbr.jurisdictions) {
            pbr.jurisdictions = JSON.parse(pbr.jurisdictions);
        }
        if (pbr.renewals) {
            pbr.renewals = JSON.parse(pbr.renewals);
        }

        return pbr;
    }

    /**
     * Finds PBR records by owner.
     * 
     * @async
     * @param {string} personId - Owner UUID
     * @returns {Promise<Array>} Array of PBR records
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                pbr.*,
                ir.reference_number,
                v.variety_name,
                v.species
            FROM pbr_records pbr
            JOIN ip_records ir ON pbr.ip_record_id = ir.ip_record_id
            LEFT JOIN varieties v ON pbr.variety_id = v.variety_id
            WHERE ir.owner_id = @personId AND pbr.is_deleted = 0
            ORDER BY pbr.application_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets PBR statistics.
     * 
     * @async
     * @returns {Promise<Object>} PBR statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_pbrs,
                COUNT(CASE WHEN pbr.status = 'Applied' THEN 1 END) as applied,
                COUNT(CASE WHEN pbr.status = 'Under Examination' THEN 1 END) as under_examination,
                COUNT(CASE WHEN pbr.status = 'Granted' THEN 1 END) as granted,
                COUNT(CASE WHEN pbr.status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN pbr.status = 'Expired' THEN 1 END) as expired,
                COUNT(CASE WHEN pbr.status = 'Abandoned' THEN 1 END) as abandoned,
                COUNT(DISTINCT v.species) as unique_species,
                AVG(DATEDIFF(day, pbr.application_date, pbr.grant_date)) as avg_grant_days
            FROM pbr_records pbr
            LEFT JOIN varieties v ON pbr.variety_id = v.variety_id
            WHERE pbr.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Gets PBR by variety name.
     * 
     * @async
     * @param {string} varietyName - Variety name
     * @returns {Promise<Array>} Array of PBR records
     */
    async findByVarietyName(varietyName) {
        if (!varietyName) {
            throw new Error('Variety name is required');
        }

        const query = `
            SELECT 
                pbr.*,
                ir.reference_number,
                v.variety_id,
                v.variety_name,
                v.species,
                v.genus
            FROM pbr_records pbr
            JOIN ip_records ir ON pbr.ip_record_id = ir.ip_record_id
            JOIN varieties v ON pbr.variety_id = v.variety_id
            WHERE v.variety_name LIKE @varietyName AND pbr.is_deleted = 0
            ORDER BY v.variety_name
        `;

        const result = await executeQuery(query, [
            { name: 'varietyName', value: `%${varietyName}%` }
        ]);

        return result.recordset;
    }

    /**
     * Updates PBR status.
     * 
     * @async
     * @param {string} pbrId - PBR UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated PBR
     */
    async updateStatus(pbrId, status, updatedBy, metadata = null) {
        if (!pbrId || !status) {
            throw new Error('PBR ID and status are required');
        }

        let query = `
            UPDATE pbr_records
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'pbrId', type: sql.UniqueIdentifier, value: pbrId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (status === 'Granted') {
            query += `, grant_date = GETDATE()`;
        }

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE pbr_id = @pbrId`;

        await executeQuery(query, params);

        logger.info('PBR status updated', { pbrId, status, updatedBy });
        return this.findById(pbrId);
    }

    /**
     * Records a PBR renewal.
     * 
     * @async
     * @param {string} pbrId - PBR UUID
     * @param {Object} renewalData - Renewal data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated PBR
     */
    async recordRenewal(pbrId, renewalData, updatedBy) {
        if (!pbrId || !renewalData) {
            throw new Error('PBR ID and renewal data are required');
        }

        const insertQuery = `
            INSERT INTO pbr_renewals (
                renewal_id,
                pbr_id,
                renewal_date,
                renewal_due_date,
                renewal_status,
                amount_paid,
                payment_reference,
                created_by,
                created_at
            ) VALUES (
                @renewalId,
                @pbrId,
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
            { name: 'pbrId', type: sql.UniqueIdentifier, value: pbrId },
            { name: 'renewalDate', value: renewalData.renewalDate || new Date() },
            { name: 'renewalDueDate', value: renewalData.renewalDueDate },
            { name: 'amountPaid', value: renewalData.amountPaid || 0 },
            { name: 'paymentReference', value: renewalData.paymentReference || null },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.info('PBR renewal recorded', { pbrId, renewalId, updatedBy });
        return this.findById(pbrId);
    }

    /**
     * Gets PBR by application number.
     * 
     * @async
     * @param {string} applicationNumber - PBR application number
     * @returns {Promise<Object|null>} PBR object
     */
    async findByApplicationNumber(applicationNumber) {
        if (!applicationNumber) {
            throw new Error('Application number is required');
        }

        const query = `
            SELECT * FROM pbr_records 
            WHERE application_number = @applicationNumber AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'applicationNumber', value: applicationNumber }
        ]);

        return result.recordset[0] || null;
    }
}

module.exports = new PbrRepository();