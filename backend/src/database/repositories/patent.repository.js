/**
 * Patent Repository
 * =================
 * Manages database operations for patent_records table.
 * 
 * Database Schema (patent_records):
 * - patent_id (uniqueidentifier, PK)
 * - ip_record_id (uniqueidentifier, FK)
 * - patent_number (nvarchar, nullable)
 * - application_number (nvarchar, nullable)
 * - filing_date (date, nullable)
 * - grant_date (date, nullable)
 * - publication_date (date, nullable)
 * - expiry_date (date, nullable)
 * - jurisdiction (nvarchar, nullable)
 * - patent_status (nvarchar, nullable) - 'Filed', 'Under Examination', 'Granted', 'Rejected', 'Abandoned', 'Expired'
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Note: There is NO 'patent_renewals' table in the database.
 * There is NO 'is_deleted' column.
 * 
 * @module repositories/patent.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * PatentRepository class for managing patent records.
 * 
 * @class PatentRepository
 * @extends BaseRepository
 */
class PatentRepository extends BaseRepository {
    constructor() {
        super('patent_records', 'patent_id');
    }

    /**
     * Finds a complete patent record with owner details.
     * 
     * @async
     * @param {string} id - Patent UUID
     * @returns {Promise<Object|null>} Complete patent object
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
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                i.institute_name as institute_name
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            WHERE pr.patent_id = @id
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Finds patents by owner.
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
            WHERE ir.owner_id = @personId
            ORDER BY pr.filing_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
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
                COUNT(CASE WHEN patent_status = 'Filed' THEN 1 END) as filed,
                COUNT(CASE WHEN patent_status = 'Under Examination' THEN 1 END) as under_examination,
                COUNT(CASE WHEN patent_status = 'Granted' THEN 1 END) as granted,
                COUNT(CASE WHEN patent_status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN patent_status = 'Expired' THEN 1 END) as expired,
                COUNT(CASE WHEN patent_status = 'Abandoned' THEN 1 END) as abandoned,
                AVG(DATEDIFF(day, filing_date, grant_date)) as avg_grant_days
            FROM patent_records
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
            SET patent_status = @status,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'patentId', type: sql.UniqueIdentifier, value: patentId },
            { name: 'status', value: status }
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

        query += ` WHERE patent_id = @patentId`;

        await executeQuery(query, params);

        logger.info('Patent status updated', { patentId, status, updatedBy });
        return this.findById(patentId);
    }

    /**
     * Searches patents by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of matching patents
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                pr.patent_id,
                pr.application_number,
                pr.title,
                pr.patent_status,
                pr.filing_date,
                pr.grant_date,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE (
                pr.application_number LIKE @searchTerm
                OR pr.title LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY pr.filing_date DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Gets patents expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=180] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of patents expiring soon
     */
    async getExpiringSoon(daysThreshold = 180) {
        const query = `
            SELECT 
                pr.patent_id,
                pr.application_number,
                pr.title,
                pr.expiry_date,
                DATEDIFF(day, GETDATE(), pr.expiry_date) as days_until_expiry,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE pr.patent_status = 'Granted'
            AND pr.expiry_date IS NOT NULL
            AND pr.expiry_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY pr.expiry_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }

    /**
     * Gets patent by application number.
     * 
     * @async
     * @param {string} applicationNumber - Patent application number
     * @returns {Promise<Object|null>} Patent object
     */
    async findByApplicationNumber(applicationNumber) {
        if (!applicationNumber) {
            throw new Error('Application number is required');
        }

        const query = `
            SELECT * FROM patent_records 
            WHERE application_number = @applicationNumber
        `;

        const result = await executeQuery(query, [
            { name: 'applicationNumber', value: applicationNumber }
        ]);

        return result.recordset[0] || null;
    }
}

module.exports = new PatentRepository();