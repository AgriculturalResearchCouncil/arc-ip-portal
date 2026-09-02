// src/database/repositories/ip-record.repository.js
/**
 * IP Record Repository
 * ====================
 * Manages database operations for ip_records table.
 * 
 * Database Schema (ip_records):
 * - ip_record_id (uniqueidentifier, PK)
 * - reference_number (nvarchar, required)
 * - record_type (nvarchar, required)
 * - title (nvarchar, required)
 * - description (nvarchar, nullable)
 * - institute_id (uniqueidentifier, nullable, FK)
 * - owner_id (uniqueidentifier, nullable, FK to persons)
 * - status (nvarchar, nullable)
 * - confidentiality_level (nvarchar, nullable)
 * - migration_batch_id (uniqueidentifier, nullable)
 * - legacy_reference (nvarchar, nullable)
 * - migration_source (nvarchar, nullable)
 * - created_by (uniqueidentifier, nullable, FK to persons)
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * @module repositories/ip-record.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

class IpRecordRepository extends BaseRepository {
    constructor() {
        super('ip_records', 'ip_record_id');
    }

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
                i.institute_name as institute_name
            FROM ip_records ir
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON ir.institute_id = i.institute_id
            WHERE ir.ip_record_id = @id
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        return result.recordset[0] || null;
    }

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
            WHERE ir.owner_id = @personId
            ORDER BY ir.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

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
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE ir.record_type = @recordType
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
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

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
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE (
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

    async updateStatus(ipRecordId, status, updatedBy) {
        if (!ipRecordId || !status) {
            throw new Error('IP Record ID and status are required');
        }

        const query = `
            UPDATE ip_records
            SET status = @status,
                updated_at = GETDATE()
            WHERE ip_record_id = @ipRecordId
        `;

        await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
            { name: 'status', value: status }
        ]);

        return this.findById(ipRecordId);
    }

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
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE ir.institute_id = @instituteId
            ORDER BY ir.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'instituteId', type: sql.UniqueIdentifier, value: instituteId }
        ]);

        return result.recordset;
    }

    async getPendingRecords(recordType = null) {
        let query = `
            SELECT 
                ir.*,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM ip_records ir
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE ir.status IN ('Submitted', 'Under Review')
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