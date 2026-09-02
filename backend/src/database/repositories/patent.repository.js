// src/database/repositories/patent.repository.js
/**
 * Patent Repository
 * =================
 * Manages database operations for patent records.
 * Handles patent-specific data including:
 * - Patent details (application number, filing date, grant date)
 * - Jurisdictions and territories
 * - Patent family relationships
 * - Renewal and maintenance tracking
 * - Patent status and lifecycle
 * 
 * @module repositories/patent.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * PatentRepository class for managing patent records.
 * Extends BaseRepository with patent-specific operations.
 * 
 * @class PatentRepository
 * @extends BaseRepository
 */
class PatentRepository extends BaseRepository {
    /**
     * Creates an instance of PatentRepository.
     * Initializes with the 'patent_records' table and 'patent_id' as primary key.
     */
    constructor() {
        super('patent_records', 'patent_id');
    }

    /**
     * Finds a complete patent record with all related data.
     * Includes IP record, owner details, jurisdictions, and maintenance history.
     * 
     * @async
     * @param {string} id - Patent UUID
     * @returns {Promise<Object|null>} Complete patent object
     * 
     * @example
     * const patent = await patentRepository.findFullPatent(patentId);
     * console.log(`Patent: ${patent.application_number}`);
     * console.log(`Status: ${patent.status}`);
     */
    async findFullPatent(id) {
        if (!id) {
            throw new Error('Patent ID is required');
        }

        const query = `
            SELECT 
                pr.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status,
                ir.confidentiality_level,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                (
                    SELECT 
                        pj.jurisdiction_id,
                        pj.jurisdiction_code,
                        pj.jurisdiction_name,
                        pj.filing_date,
                        pj.grant_date,
                        pj.expiry_date,
                        pj.status as jurisdiction_status
                    FROM patent_jurisdictions pj
                    WHERE pj.patent_id = pr.patent_id
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
                    FROM patent_renewals prn
                    WHERE prn.patent_id = pr.patent_id
                    ORDER BY prn.renewal_due_date DESC
                    FOR JSON PATH
                ) as renewals,
                (
                    SELECT 
                        pf.family_id,
                        pf.family_reference,
                        pf.relationship_type,
                        pf.related_patent_id,
                        pr2.application_number as related_application
                    FROM patent_family pf
                    LEFT JOIN patent_records pr2 ON pf.related_patent_id = pr2.patent_id
                    WHERE pf.patent_id = pr.patent_id
                    FOR JSON PATH
                ) as family
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE pr.patent_id = @id AND pr.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const patent = result.recordset[0];
        
        // Parse JSON fields
        if (patent.jurisdictions) {
            patent.jurisdictions = JSON.parse(patent.jurisdictions);
        }
        if (patent.renewals) {
            patent.renewals = JSON.parse(patent.renewals);
        }
        if (patent.family) {
            patent.family = JSON.parse(patent.family);
        }

        return patent;
    }

    /**
     * Finds patents by owner (researcher).
     * 
     * @async
     * @param {string} personId - Owner UUID
     * @returns {Promise<Array>} Array of patents
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                pr.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            WHERE ir.owner_id = @personId AND pr.is_deleted = 0
            ORDER BY pr.filing_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets patents with pending renewals.
     * 
     * @async
     * @param {number} [daysThreshold=90] - Days before renewal is due
     * @returns {Promise<Array>} Array of patents needing renewal
     */
    async getPendingRenewals(daysThreshold = 90) {
        const query = `
            SELECT 
                pr.patent_id,
                pr.application_number,
                pr.title,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                prn.renewal_due_date,
                DATEDIFF(day, GETDATE(), prn.renewal_due_date) as days_until_due,
                prn.renewal_status
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            JOIN patent_jurisdictions pj ON pj.patent_id = pr.patent_id
            JOIN patent_renewals prn ON prn.patent_id = pr.patent_id
            WHERE pr.is_deleted = 0
            AND prn.renewal_status = 'Pending'
            AND prn.renewal_due_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY prn.renewal_due_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }

    /**
     * Gets patent statistics.
     * 
     * @async
     * @returns {Promise<Object>} Patent statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_patents,
                COUNT(CASE WHEN pr.status = 'Filed' THEN 1 END) as filed,
                COUNT(CASE WHEN pr.status = 'Granted' THEN 1 END) as granted,
                COUNT(CASE WHEN pr.status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN pr.status = 'Expired' THEN 1 END) as expired,
                COUNT(CASE WHEN pr.status = 'Abandoned' THEN 1 END) as abandoned,
                COUNT(CASE WHEN prn.renewal_status = 'Pending' AND prn.renewal_due_date <= DATEADD(day, 90, GETDATE()) THEN 1 END) as pending_renewals,
                AVG(DATEDIFF(day, pr.filing_date, pr.grant_date)) as avg_grant_days
            FROM patent_records pr
            LEFT JOIN patent_renewals prn ON prn.patent_id = pr.patent_id AND prn.renewal_status = 'Pending'
            WHERE pr.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Updates patent status.
     * 
     * @async
     * @param {string} patentId - Patent UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated patent
     */
    async updateStatus(patentId, status, updatedBy, metadata = null) {
        if (!patentId || !status) {
            throw new Error('Patent ID and status are required');
        }

        let query = `
            UPDATE patent_records
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'patentId', type: sql.UniqueIdentifier, value: patentId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        // Add grant date if status is Granted
        if (status === 'Granted') {
            query += `, grant_date = GETDATE()`;
        }

        // Add metadata updates
        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE patent_id = @patentId`;

        await executeQuery(query, params);

        logger.info('Patent status updated', { patentId, status, updatedBy });
        return this.findById(patentId);
    }

    /**
     * Records a renewal payment.
     * 
     * @async
     * @param {string} patentId - Patent UUID
     * @param {Object} renewalData - Renewal data
     * @param {string} renewalData.renewalDate - Date of renewal
     * @param {string} renewalData.renewalDueDate - Next renewal due date
     * @param {number} renewalData.amountPaid - Amount paid
     * @param {string} renewalData.paymentReference - Payment reference
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Renewal record
     */
    async recordRenewal(patentId, renewalData, updatedBy) {
        if (!patentId || !renewalData) {
            throw new Error('Patent ID and renewal data are required');
        }

        // Insert renewal record
        const insertQuery = `
            INSERT INTO patent_renewals (
                renewal_id,
                patent_id,
                renewal_date,
                renewal_due_date,
                renewal_status,
                amount_paid,
                payment_reference,
                created_by,
                created_at
            ) VALUES (
                @renewalId,
                @patentId,
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
            { name: 'patentId', type: sql.UniqueIdentifier, value: patentId },
            { name: 'renewalDate', value: renewalData.renewalDate || new Date() },
            { name: 'renewalDueDate', value: renewalData.renewalDueDate },
            { name: 'amountPaid', value: renewalData.amountPaid || 0 },
            { name: 'paymentReference', value: renewalData.paymentReference || null },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        // Update patent status if needed
        await this.updateStatus(patentId, 'Maintained', updatedBy);

        logger.info('Patent renewal recorded', { patentId, renewalId, updatedBy });
        return this.findById(patentId);
    }
}

module.exports = new PatentRepository();