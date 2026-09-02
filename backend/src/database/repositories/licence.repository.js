// src/database/repositories/licence.repository.js
/**
 * Licence Repository
 * ==================
 * Manages database operations for licence records.
 * Handles all licence-related data including:
 * - Licence creation and management
 * - Licence status tracking
 * - Licence type and terms
 * - Renewal and expiry management
 * - Licence search and filtering
 * - Licence statistics
 * 
 * @module repositories/licence.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * LicenceRepository class for managing licence records.
 * Extends BaseRepository with licence-specific operations.
 * 
 * @class LicenceRepository
 * @extends BaseRepository
 */
class LicenceRepository extends BaseRepository {
    /**
     * Creates an instance of LicenceRepository.
     * Initializes with the 'licence_records' table and 'licence_id' as primary key.
     * 
     * @constructor
     */
    constructor() {
        super('licence_records', 'licence_id');
    }

    /**
     * Finds a complete licence record with all related data.
     * Includes licensees, territories, obligations, milestones, and royalty structures.
     * 
     * @async
     * @param {string} id - Licence UUID
     * @returns {Promise<Object|null>} Complete licence object
     * 
     * @example
     * const licence = await licenceRepository.findFullLicence(licenceId);
     * console.log(`Licence: ${licence.licence_title}`);
     * console.log(`Licensees: ${licence.licensees.length}`);
     * console.log(`Obligations: ${licence.obligations.length}`);
     */
    async findFullLicence(id) {
        // Validate input parameter
        if (!id) {
            throw new Error('Licence ID is required');
        }

        // Build the main query with all related data as JSON arrays
        const query = `
            SELECT 
                lr.*,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                (
                    SELECT 
                        ll.licensee_id,
                        ll.organisation_name,
                        ll.contact_person,
                        ll.email,
                        ll.phone,
                        ll.address,
                        ll.registration_number,
                        ll.is_primary_licensee,
                        ll.status as licensee_status
                    FROM licence_licensees ll
                    WHERE ll.licence_id = lr.licence_id
                    AND ll.is_deleted = 0
                    FOR JSON PATH
                ) as licensees,
                (
                    SELECT 
                        lt.territory_id,
                        lt.country_code,
                        lt.country_name,
                        lt.region,
                        lt.exclusive,
                        lt.sublicensable,
                        lt.status as territory_status
                    FROM licence_territories lt
                    WHERE lt.licence_id = lr.licence_id
                    AND lt.is_deleted = 0
                    FOR JSON PATH
                ) as territories,
                (
                    SELECT 
                        lo.obligation_id,
                        lo.obligation_type,
                        lo.obligation_description,
                        lo.due_date,
                        lo.completion_date,
                        lo.status as obligation_status,
                        lo.reminder_days,
                        lo.notified_at,
                        lo.notes
                    FROM licence_obligations lo
                    WHERE lo.licence_id = lr.licence_id
                    AND lo.is_deleted = 0
                    ORDER BY lo.due_date ASC
                    FOR JSON PATH
                ) as obligations,
                (
                    SELECT 
                        lm.milestone_id,
                        lm.milestone_name,
                        lm.milestone_description,
                        lm.target_date,
                        lm.achieved_date,
                        lm.status as milestone_status,
                        lm.weight,
                        lm.proof_of_achievement,
                        lm.notes
                    FROM licence_milestones lm
                    WHERE lm.licence_id = lr.licence_id
                    AND lm.is_deleted = 0
                    ORDER BY lm.target_date ASC
                    FOR JSON PATH
                ) as milestones,
                (
                    SELECT 
                        rs.royalty_structure_id,
                        rs.royalty_type,
                        rs.royalty_rate,
                        rs.fixed_amount,
                        rs.tier_threshold,
                        rs.tier_rate,
                        rs.calculation_method,
                        rs.payment_terms,
                        rs.reporting_requirements,
                        rs.currency,
                        rs.frequency,
                        rs.status as royalty_status
                    FROM licence_royalty_structures rs
                    WHERE rs.licence_id = lr.licence_id
                    AND rs.is_deleted = 0
                    FOR JSON PATH
                ) as royalty_structures,
                (
                    SELECT 
                        rp.payment_id,
                        rp.payment_date,
                        rp.payment_amount,
                        rp.payment_currency,
                        rp.payment_reference,
                        rp.payment_type,
                        rp.payment_status,
                        rp.calculation_period_start,
                        rp.calculation_period_end,
                        rp.amount_owed,
                        rp.notes,
                        rp.receipt_proof
                    FROM licence_royalty_payments rp
                    WHERE rp.licence_id = lr.licence_id
                    AND rp.is_deleted = 0
                    ORDER BY rp.payment_date DESC
                    FOR JSON PATH
                ) as royalty_payments
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE lr.licence_id = @id AND lr.is_deleted = 0
        `;

        // Execute the query with the licence ID parameter
        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        // If no record found, return null
        if (result.recordset.length === 0) {
            return null;
        }

        // Get the licence record
        const licence = result.recordset[0];
        
        // Parse JSON fields into arrays
        if (licence.licensees) {
            licence.licensees = JSON.parse(licence.licensees);
        }
        if (licence.territories) {
            licence.territories = JSON.parse(licence.territories);
        }
        if (licence.obligations) {
            licence.obligations = JSON.parse(licence.obligations);
        }
        if (licence.milestones) {
            licence.milestones = JSON.parse(licence.milestones);
        }
        if (licence.royalty_structures) {
            licence.royalty_structures = JSON.parse(licence.royalty_structures);
        }
        if (licence.royalty_payments) {
            licence.royalty_payments = JSON.parse(licence.royalty_payments);
        }

        return licence;
    }

    /**
     * Finds licences by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of licences
     */
    async findByIpRecord(ipRecordId) {
        // Validate input
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                lr.*,
                COUNT(DISTINCT ll.licensee_id) as licensee_count,
                COUNT(DISTINCT lo.obligation_id) as obligation_count,
                SUM(CASE WHEN rp.payment_status = 'Pending' THEN rp.amount_owed ELSE 0 END) as total_pending
            FROM licence_records lr
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            LEFT JOIN licence_obligations lo ON lo.licence_id = lr.licence_id AND lo.is_deleted = 0
            LEFT JOIN licence_royalty_payments rp ON rp.licence_id = lr.licence_id AND rp.is_deleted = 0
            WHERE lr.ip_record_id = @ipRecordId AND lr.is_deleted = 0
            GROUP BY lr.licence_id, lr.licence_title, lr.licence_type, lr.licence_status,
                     lr.start_date, lr.end_date, lr.renewal_term, lr.renewal_option,
                     lr.territory_scope, lr.exclusive_territory, lr.created_at,
                     lr.updated_at, lr.is_deleted, lr.ip_record_id, lr.licence_description
            ORDER BY lr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
    }

    /**
     * Gets licences by licensee.
     * 
     * @async
     * @param {string} licenseeId - Licensee UUID
     * @returns {Promise<Array>} Array of licences
     */
    async findByLicensee(licenseeId) {
        if (!licenseeId) {
            throw new Error('Licensee ID is required');
        }

        const query = `
            SELECT 
                lr.*,
                ll.organisation_name,
                ll.contact_person
            FROM licence_records lr
            JOIN licence_licensees ll ON ll.licence_id = lr.licence_id
            WHERE ll.licensee_id = @licenseeId AND lr.is_deleted = 0
            ORDER BY lr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'licenseeId', type: sql.UniqueIdentifier, value: licenseeId }
        ]);

        return result.recordset;
    }

    /**
     * Gets licences expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=90] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of licences expiring soon
     */
    async getExpiringSoon(daysThreshold = 90) {
        const query = `
            SELECT 
                lr.licence_id,
                lr.licence_title,
                lr.licence_type,
                lr.end_date,
                DATEDIFF(day, GETDATE(), lr.end_date) as days_until_expiry,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                COUNT(DISTINCT ll.licensee_id) as licensee_count,
                STRING_AGG(ll.organisation_name, ', ') as licensee_names
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            WHERE lr.is_deleted = 0
            AND lr.licence_status = 'Active'
            AND lr.end_date IS NOT NULL
            AND lr.end_date <= DATEADD(day, @daysThreshold, GETDATE())
            GROUP BY lr.licence_id, lr.licence_title, lr.licence_type, lr.end_date,
                     ir.reference_number, ir.title
            ORDER BY lr.end_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }

    /**
     * Gets licence statistics.
     * 
     * @async
     * @returns {Promise<Object>} Licence statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_licences,
                COUNT(CASE WHEN licence_status = 'Draft' THEN 1 END) as draft,
                COUNT(CASE WHEN licence_status = 'Negotiation' THEN 1 END) as negotiation,
                COUNT(CASE WHEN licence_status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN licence_status = 'Expired' THEN 1 END) as expired,
                COUNT(CASE WHEN licence_status = 'Terminated' THEN 1 END) as terminated,
                COUNT(CASE WHEN licence_status = 'Under Review' THEN 1 END) as under_review,
                COUNT(CASE WHEN end_date < GETDATE() AND licence_status = 'Active' THEN 1 END) as overdue,
                AVG(CASE WHEN end_date IS NOT NULL THEN DATEDIFF(day, start_date, end_date) ELSE NULL END) as avg_licence_duration,
                SUM(CASE WHEN lr.licence_status = 'Active' AND rs.royalty_type = 'Percentage' 
                    THEN rs.royalty_rate * 1.0 ELSE 0 END) as total_active_royalty_rate
            FROM licence_records lr
            LEFT JOIN licence_royalty_structures rs ON rs.licence_id = lr.licence_id AND rs.is_deleted = 0
            WHERE lr.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Searches licences by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of matching licences
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                lr.licence_id,
                lr.licence_title,
                lr.licence_type,
                lr.licence_status,
                lr.start_date,
                lr.end_date,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name,
                COUNT(DISTINCT ll.licensee_id) as licensee_count
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            WHERE lr.is_deleted = 0
            AND (
                lr.licence_title LIKE @searchTerm
                OR lr.licence_description LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR ir.title LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
                OR ll.organisation_name LIKE @searchTerm
            )
            GROUP BY lr.licence_id, lr.licence_title, lr.licence_type, lr.licence_status,
                     lr.start_date, lr.end_date, ir.reference_number, p.first_name, p.last_name
            ORDER BY lr.created_at DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Updates licence status.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated licence
     */
    async updateStatus(licenceId, status, updatedBy, metadata = null) {
        if (!licenceId || !status) {
            throw new Error('Licence ID and status are required');
        }

        // Build the update query dynamically
        let query = `
            UPDATE licence_records
            SET licence_status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        // Add metadata fields if provided
        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE licence_id = @licenceId`;

        await executeQuery(query, params);

        logger.info('Licence status updated', { licenceId, status, updatedBy });
        return this.findById(licenceId);
    }

    /**
     * Gets licences by status.
     * 
     * @async
     * @param {string} status - Licence status
     * @returns {Promise<Array>} Array of licences
     */
    async findByStatus(status) {
        if (!status) {
            throw new Error('Status is required');
        }

        const query = `
            SELECT 
                lr.*,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE lr.licence_status = @status AND lr.is_deleted = 0
            ORDER BY lr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'status', value: status }
        ]);

        return result.recordset;
    }

    /**
     * Gets licences by type.
     * 
     * @async
     * @param {string} licenceType - Licence type
     * @returns {Promise<Array>} Array of licences
     */
    async findByType(licenceType) {
        if (!licenceType) {
            throw new Error('Licence type is required');
        }

        const query = `
            SELECT 
                lr.*,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE lr.licence_type = @licenceType AND lr.is_deleted = 0
            ORDER BY lr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'licenceType', value: licenceType }
        ]);

        return result.recordset;
    }

    /**
     * Gets active licences for an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of active licences
     */
    async getActiveLicences(ipRecordId) {
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                lr.*,
                COUNT(DISTINCT ll.licensee_id) as licensee_count
            FROM licence_records lr
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            WHERE lr.ip_record_id = @ipRecordId
            AND lr.licence_status = 'Active'
            AND lr.is_deleted = 0
            AND (lr.end_date IS NULL OR lr.end_date >= GETDATE())
            GROUP BY lr.licence_id, lr.licence_title, lr.licence_type, lr.licence_status,
                     lr.start_date, lr.end_date, lr.renewal_term, lr.renewal_option,
                     lr.territory_scope, lr.exclusive_territory, lr.created_at,
                     lr.updated_at, lr.is_deleted, lr.ip_record_id, lr.licence_description
            ORDER BY lr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
    }
}

// Export a singleton instance of the repository
module.exports = new LicenceRepository();