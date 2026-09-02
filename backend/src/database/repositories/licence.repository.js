/**
 * Licence Repository
 * ==================
 * Manages database operations for licence_records table.
 * 
 * Database Schema (licence_records):
 * - licence_id (uniqueidentifier, PK)
 * - ip_record_id (uniqueidentifier, FK to ip_records)
 * - licence_number (nvarchar, nullable)
 * - licensee_name (nvarchar, required)
 * - territory (nvarchar, nullable)
 * - exclusivity (nvarchar, nullable) - 'Exclusive', 'Non-Exclusive', 'Sublicensable'
 * - start_date (date, required)
 * - end_date (date, nullable)
 * - royalty_percentage (decimal, nullable)
 * - annual_fee (decimal, nullable)
 * - status (nvarchar, nullable) - 'Draft', 'Active', 'Expired', 'Terminated'
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Note: There is NO 'is_deleted' column in this table.
 * 
 * @module repositories/licence.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * LicenceRepository class for managing licences.
 * 
 * @class LicenceRepository
 * @extends BaseRepository
 */
class LicenceRepository extends BaseRepository {
    constructor() {
        super('licence_records', 'licence_id');
    }

    /**
     * Finds a complete licence with all related data.
     * 
     * @async
     * @param {string} id - Licence UUID
     * @returns {Promise<Object|null>} Complete licence object
     */
    async findFullLicence(id) {
        if (!id) {
            throw new Error('Licence ID is required');
        }

        const query = `
            SELECT 
                lr.*,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE lr.licence_id = @id
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Finds licences by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of licences
     */
    async findByIpRecord(ipRecordId) {
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                lr.*,
                p.first_name + ' ' + p.last_name as owner_name
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE lr.ip_record_id = @ipRecordId
            ORDER BY lr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
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
                lr.licence_number,
                lr.licensee_name,
                lr.territory,
                lr.end_date,
                DATEDIFF(day, GETDATE(), lr.end_date) as days_until_expiry,
                ir.reference_number as ip_reference,
                ir.title as ip_title
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            WHERE lr.status = 'Active'
            AND lr.end_date IS NOT NULL
            AND lr.end_date <= DATEADD(day, @daysThreshold, GETDATE())
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
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_licences,
                COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'Expired' THEN 1 END) as expired,
                COUNT(CASE WHEN status = 'Terminated' THEN 1 END) as terminated,
                AVG(royalty_percentage) as avg_royalty,
                SUM(annual_fee) as total_annual_fees
            FROM licence_records
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Updates licence status.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated licence
     */
    async updateStatus(licenceId, status, updatedBy) {
        if (!licenceId || !status) {
            throw new Error('Licence ID and status are required');
        }

        const query = `
            UPDATE licence_records
            SET status = @status,
                updated_at = GETDATE()
            WHERE licence_id = @licenceId
        `;

        await executeQuery(query, [
            { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
            { name: 'status', value: status }
        ]);

        logger.info('Licence status updated', { licenceId, status, updatedBy });
        return this.findById(licenceId);
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
                lr.licence_number,
                lr.licensee_name,
                lr.territory,
                lr.status,
                lr.start_date,
                lr.end_date,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE (
                lr.licence_number LIKE @searchTerm
                OR lr.licensee_name LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY lr.created_at DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }
}

module.exports = new LicenceRepository();