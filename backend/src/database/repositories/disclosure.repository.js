// src/database/repositories/disclosure.repository.js
/**
 * Disclosure Repository
 * =====================
 * Manages database operations for disclosures table.
 * 
 * Database Schema (disclosures):
 * - disclosure_id (uniqueidentifier, PK)
 * - ip_record_id (uniqueidentifier, FK to ip_records)
 * - disclosure_date (date, nullable)
 * - disclosure_category (nvarchar, nullable)
 * - novelty_description (nvarchar, nullable)
 * - commercialisation_potential (nvarchar, nullable)
 * - recommendation (nvarchar, nullable)
 * - review_status (nvarchar, nullable)
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * @module repositories/disclosure.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

class DisclosureRepository extends BaseRepository {
    constructor() {
        super('disclosures', 'disclosure_id');
    }

    async findFullDisclosure(id) {
        if (!id) {
            throw new Error('Disclosure ID is required');
        }

        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                ir.record_type,
                ir.title as ip_title,
                ir.status as ip_status,
                p.first_name as researcher_first_name,
                p.last_name as researcher_last_name,
                p.email as researcher_email,
                i.institute_name as researcher_institute
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            WHERE d.disclosure_id = @id
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        return result.recordset[0] || null;
    }

    async findByResearcher(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                ir.title as ip_title,
                ir.status as ip_status
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            WHERE ir.owner_id = @personId
            ORDER BY d.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    async findWithFilters(filters = {}) {
        let query = `
            SELECT 
                d.*,
                ir.reference_number,
                ir.title as ip_title,
                p.first_name as researcher_first_name,
                p.last_name as researcher_last_name,
                p.email as researcher_email,
                i.institute_name as researcher_institute
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.reviewStatus) {
            query += ` AND d.review_status = @reviewStatus`;
            params.push({ name: 'reviewStatus', value: filters.reviewStatus });
        }

        if (filters.category) {
            query += ` AND d.disclosure_category = @category`;
            params.push({ name: 'category', value: filters.category });
        }

        if (filters.dateFrom) {
            query += ` AND d.disclosure_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND d.disclosure_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        const sortBy = filters.sortBy || 'disclosure_date';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    async updateStatus(disclosureId, status, reviewerId, recommendation = null) {
        if (!disclosureId || !status || !reviewerId) {
            throw new Error('Disclosure ID, status, and reviewer ID are required');
        }

        let query = `
            UPDATE disclosures
            SET review_status = @status,
                recommendation = @recommendation,
                updated_at = GETDATE()
            WHERE disclosure_id = @disclosureId
        `;

        const params = [
            { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId },
            { name: 'status', value: status },
            { name: 'recommendation', value: recommendation || null }
        ];

        await executeQuery(query, params);

        logger.info('Disclosure status updated', { disclosureId, status, reviewerId });
        return this.findById(disclosureId);
    }

    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN review_status = 'Draft' THEN 1 END) as draft,
                COUNT(CASE WHEN review_status = 'Submitted' THEN 1 END) as submitted,
                COUNT(CASE WHEN review_status = 'Under Review' THEN 1 END) as under_review,
                COUNT(CASE WHEN review_status = 'Reviewed' THEN 1 END) as reviewed,
                COUNT(CASE WHEN review_status = 'Recommended' THEN 1 END) as recommended,
                COUNT(CASE WHEN review_status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN review_status = 'Approved' THEN 1 END) as approved,
                AVG(DATEDIFF(day, created_at, updated_at)) as avg_review_days
            FROM disclosures
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    async getPendingReviews() {
        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as researcher_name
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE d.review_status IN ('Submitted', 'Under Review')
            ORDER BY d.created_at ASC
        `;

        const result = await executeQuery(query);
        return result.recordset;
    }

    async search(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as researcher_name
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE (
                d.title LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
                OR CONCAT(p.first_name, ' ', p.last_name) LIKE @searchTerm
            )
            ORDER BY d.created_at DESC
            OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm }
        ]);

        return result.recordset;
    }
}

module.exports = new DisclosureRepository();