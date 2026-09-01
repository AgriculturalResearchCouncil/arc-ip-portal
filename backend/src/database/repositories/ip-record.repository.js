/**
 * IP Record Repository
 * ====================
 * Manages database operations for intellectual property records.
 * Handles all IP-related entities including disclosures, patents,
 * trademarks, copyrights, PBR, and trade secrets.
 * 
 * @module repositories/ip-record.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * IpRecordRepository class for managing IP records.
 * Handles complex queries involving:
 * - Multiple IP types (disclosure, patent, trademark, etc.)
 * - Related persons (inventors, owners, contacts)
 * - Documents and attachments
 * - Status tracking and workflows
 * - IP lifecycle management
 * 
 * @class IpRecordRepository
 * @extends BaseRepository
 */
class IpRecordRepository extends BaseRepository {
    /**
     * Creates an instance of IpRecordRepository.
     * Initializes with the 'ip_records' table and 'ip_record_id' as primary key.
     */
    constructor() {
        super('ip_records', 'ip_record_id');
    }

    /**
     * Finds an IP record with all related data.
     * Includes owner details, related persons, documents, and specific IP type details.
     * 
     * @async
     * @param {string} id - The IP record UUID
     * @returns {Promise<Object|null>} Complete IP record object or null
     * 
     * @example
     * const fullRecord = await ipRecordRepository.findFullRecord(ipRecordId);
     * console.log(`Owner: ${fullRecord.owner_first_name} ${fullRecord.owner_last_name}`);
     */
    async findFullRecord(id) {
        if (!id) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                ir.*,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                p.employee_number as owner_employee_number,
                i.name as owner_institute_name,
                (
                    SELECT 
                        ipr.ip_record_person_id,
                        ipr.person_id,
                        ipr.role_type,
                        ipr.contribution_percentage,
                        pers.first_name,
                        pers.last_name,
                        pers.email,
                        pers.employee_number,
                        pers.position_title
                    FROM ip_record_persons ipr
                    JOIN persons pers ON ipr.person_id = pers.person_id
                    WHERE ipr.ip_record_id = ir.ip_record_id
                    AND ipr.is_active = 1
                    FOR JSON PATH
                ) as persons,
                (
                    SELECT 
                        doc.document_id,
                        doc.file_name,
                        doc.document_type,
                        doc.file_size,
                        doc.uploaded_at,
                        doc.is_confidential,
                        doc.version_number
                    FROM documents doc
                    WHERE doc.ip_record_id = ir.ip_record_id
                    AND doc.is_deleted = 0
                    ORDER BY doc.version_number DESC
                    FOR JSON PATH
                ) as documents
            FROM ip_records ir
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            WHERE ir.ip_record_id = @id AND ir.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const record = result.recordset[0];
        
        // Parse JSON fields
        if (record.persons) {
            record.persons = JSON.parse(record.persons);
        }
        if (record.documents) {
            record.documents = JSON.parse(record.documents);
        }

        return record;
    }

    /**
     * Finds IP records by owner (researcher).
     * 
     * @async
     * @param {string} personId - The owner's UUID
     * @returns {Promise<Array>} Array of IP records
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                ir.*,
                d.disclosure_id,
                d.disclosure_date,
                d.review_status as disclosure_status
            FROM ip_records ir
            LEFT JOIN disclosures d ON d.ip_record_id = ir.ip_record_id
            WHERE ir.owner_id = @personId AND ir.is_deleted = 0
            ORDER BY ir.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets IP records by type with filters.
     * 
     * @async
     * @param {string} recordType - Type of IP record (Disclosure, Patent, PBR, Trademark, Copyright)
     * @param {Object} [filters={}] - Filter options
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.dateFrom] - Filter by creation date from
     * @param {string} [filters.dateTo] - Filter by creation date to
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of IP records
     */
    async findByType(recordType, filters = {}) {
        if (!recordType) {
            throw new Error('Record type is required');
        }

        let query = `
            SELECT 
                ir.*,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email
            FROM ip_records ir
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE ir.record_type = @recordType AND ir.is_deleted = 0
        `;

        const params = [
            { name: 'recordType', value: recordType }
        ];

        if (filters.status) {
            query += ` AND ir.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.dateFrom) {
            query += ` AND ir.created_at >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND ir.created_at <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY ir.created_at DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets IP record statistics for dashboard.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN record_type = 'Disclosure' THEN 1 END) as disclosures,
                COUNT(CASE WHEN record_type = 'Patent' THEN 1 END) as patents,
                COUNT(CASE WHEN record_type = 'PBR' THEN 1 END) as pbrs,
                COUNT(CASE WHEN record_type = 'Trademark' THEN 1 END) as trademarks,
                COUNT(CASE WHEN record_type = 'Copyright' THEN 1 END) as copyrights,
                COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft,
                COUNT(CASE WHEN status = 'Submitted' THEN 1 END) as submitted,
                COUNT(CASE WHEN status = 'Under Review' THEN 1 END) as under_review,
                COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN status = 'Granted' THEN 1 END) as granted
            FROM ip_records
            WHERE is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Searches IP records by reference number, title, or owner name.
     * 
     * @async
     * @param {string} searchQuery - The search term
     * @param {number} [limit=20] - Maximum results
     * @returns {Promise<Array>} Array of matching IP records
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const sqlQuery = `
            SELECT 
                ir.ip_record_id,
                ir.reference_number,
                ir.record_type,
                ir.title,
                ir.status,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name
            FROM ip_records ir
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE ir.is_deleted = 0
            AND (
                ir.reference_number LIKE @searchTerm
                OR ir.title LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
                OR CONCAT(p.first_name, ' ', p.last_name) LIKE @searchTerm
            )
            ORDER BY ir.created_at DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(sqlQuery, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Updates the status of an IP record.
     * 
     * @async
     * @param {string} ipRecordId - The IP record UUID
     * @param {string} status - New status
     * @param {string} updatedBy - Person ID of the user making the update
     * @returns {Promise<Object>} Updated IP record
     */
    async updateStatus(ipRecordId, status, updatedBy) {
        if (!ipRecordId || !status) {
            throw new Error('IP Record ID and status are required');
        }

        const query = `
            UPDATE ip_records
            SET status = @status, 
                updated_by = @updatedBy, 
                updated_at = GETDATE()
            WHERE ip_record_id = @ipRecordId
        `;

        await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.info('IP record status updated', { ipRecordId, status, updatedBy });
        return this.findById(ipRecordId);
    }

    /**
     * Gets IP records by institute.
     * 
     * @async
     * @param {string} instituteId - The institute UUID
     * @returns {Promise<Array>} Array of IP records
     */
    async findByInstitute(instituteId) {
        if (!instituteId) {
            throw new Error('Institute ID is required');
        }

        const query = `
            SELECT 
                ir.*,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name
            FROM ip_records ir
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE p.institute_id = @instituteId AND ir.is_deleted = 0
            ORDER BY ir.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'instituteId', type: sql.UniqueIdentifier, value: instituteId }
        ]);

        return result.recordset;
    }

    /**
     * Gets pending records for review.
     * 
     * @async
     * @param {string} recordType - Type of record to filter
     * @returns {Promise<Array>} Array of pending records
     */
    async getPendingRecords(recordType = null) {
        let query = `
            SELECT 
                ir.*,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM ip_records ir
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE ir.status IN ('Submitted', 'Under Review')
            AND ir.is_deleted = 0
        `;

        const params = [];

        if (recordType) {
            query += ` AND ir.record_type = @recordType`;
            params.push({ name: 'recordType', value: recordType });
        }

        query += ` ORDER BY ir.created_at ASC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }
}

module.exports = new IpRecordRepository();