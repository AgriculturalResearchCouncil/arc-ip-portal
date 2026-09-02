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
 * - review_status (nvarchar, nullable) - 'Draft', 'Submitted', 'Under Review', 'Reviewed', 'Recommended', 'Rejected', 'Approved'
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Note: There is NO 'title' column in disclosures table.
 * Titles come from ip_records.title.
 * 
 * @module repositories/disclosure.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * DisclosureRepository class for managing invention disclosures.
 * 
 * @class DisclosureRepository
 * @extends BaseRepository
 */
class DisclosureRepository extends BaseRepository {
    constructor() {
        super('disclosures', 'disclosure_id');
    }

    /**
     * Finds a complete disclosure with all related data.
     * 
     * @async
     * @param {string} id - Disclosure UUID
     * @returns {Promise<Object|null>} Complete disclosure object
     */
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

    /**
     * Finds disclosures by researcher.
     * 
     * @async
     * @param {string} personId - Researcher UUID
     * @returns {Promise<Array>} Array of disclosures
     */
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

    /**
     * Finds disclosures with advanced filtering for TTO staff.
     * 
     * @async
     * @param {Object} [filters={}] - Filter options
     * @param {string} [filters.reviewStatus] - Filter by review status
     * @param {string} [filters.category] - Filter by disclosure category
     * @param {string} [filters.dateFrom] - Filter by disclosure date from
     * @param {string} [filters.dateTo] - Filter by disclosure date to
     * @param {string} [filters.sortBy='disclosure_date'] - Sort field
     * @param {string} [filters.sortOrder='DESC'] - Sort order
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of disclosures
     */
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

    /**
     * Updates the review status of a disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {string} status - New status
     * @param {string} reviewerId - Person ID of the reviewer
     * @param {string} [recommendation] - Review recommendation/comments
     * @returns {Promise<Object>} Updated disclosure
     */
    async updateStatus(disclosureId, status, reviewerId, recommendation = null) {
        if (!disclosureId || !status || !reviewerId) {
            throw new Error('Disclosure ID, status, and reviewer ID are required');
        }

        const query = `
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

    /**
     * Gets disclosure statistics.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
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

    /**
     * Gets category breakdown of disclosures.
     * 
     * @async
     * @returns {Promise<Array>} Category breakdown
     */
    async getCategoryBreakdown() {
        const query = `
            SELECT 
                disclosure_category,
                COUNT(*) as count,
                COUNT(CASE WHEN review_status = 'Approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN review_status = 'Rejected' THEN 1 END) as rejected_count,
                COUNT(CASE WHEN review_status IN ('Submitted', 'Under Review') THEN 1 END) as pending_count
            FROM disclosures
            WHERE disclosure_category IS NOT NULL
            GROUP BY disclosure_category
            ORDER BY count DESC
        `;

        const result = await executeQuery(query);
        return result.recordset;
    }

    /**
     * Gets pending disclosures for TTO review.
     * 
     * @async
     * @returns {Promise<Array>} Array of pending disclosures
     */
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

    /**
     * Searches disclosures by reference number, researcher name, or title.
     * Note: Title comes from ip_records, not disclosures.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching disclosures
     */
    async search(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                d.*,
                ir.reference_number,
                ir.title,
                p.first_name + ' ' + p.last_name as researcher_name
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE (
                ir.title LIKE @searchTerm
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

    /**
     * Gets monthly disclosure trends.
     * 
     * @async
     * @param {number} [months=12] - Number of months to look back
     * @returns {Promise<Array>} Monthly trends
     */
    async getMonthlyTrends(months = 12) {
        const query = `
            SELECT 
                YEAR(created_at) as year,
                MONTH(created_at) as month,
                DATENAME(month, created_at) as month_name,
                COUNT(*) as total_submissions,
                COUNT(CASE WHEN review_status = 'Approved' THEN 1 END) as approved,
                COUNT(CASE WHEN review_status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN review_status IN ('Submitted', 'Under Review') THEN 1 END) as pending
            FROM disclosures
            WHERE created_at >= DATEADD(month, -@months, GETDATE())
            GROUP BY YEAR(created_at), MONTH(created_at), DATENAME(month, created_at)
            ORDER BY YEAR(created_at) DESC, MONTH(created_at) DESC
        `;

        const result = await executeQuery(query, [
            { name: 'months', value: months }
        ]);

        return result.recordset;
    }
}

module.exports = new DisclosureRepository();