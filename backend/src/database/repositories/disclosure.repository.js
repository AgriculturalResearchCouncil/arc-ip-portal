/**
 * Disclosure Repository
 * =====================
 * Manages database operations for the disclosures table.
 * Handles disclosure-specific queries including:
 * - Full disclosure details with related data
 * - Researcher-specific queries
 * - TTO review workflows
 * - Status management
 * - Statistics and reporting
 * 
 * @module repositories/disclosure.repository
 * @requires ./base.repository
 * @requires ../index
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
    /**
     * Creates an instance of DisclosureRepository.
     * Initializes with the 'disclosures' table and 'disclosure_id' as primary key.
     */
    constructor() {
        super('disclosures', 'disclosure_id');
    }

    /**
     * Finds a disclosure with all related data including:
     * - IP record details
     * - Researcher information
     * - Related persons (inventors)
     * - Documents
     * - Lifecycle events
     * 
     * @async
     * @param {string} id - The disclosure UUID
     * @returns {Promise<Object|null>} Complete disclosure object or null
     * 
     * @example
     * const disclosure = await disclosureRepository.findFullDisclosure(disclosureId);
     * console.log(`Title: ${disclosure.title}`);
     * console.log(`Researcher: ${disclosure.researcher_first_name} ${disclosure.researcher_last_name}`);
     * console.log(`Inventors: ${disclosure.persons.length}`);
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
                ir.confidentiality_level,
                p.first_name as researcher_first_name,
                p.last_name as researcher_last_name,
                p.email as researcher_email,
                p.employee_number as researcher_employee_number,
                i.name as researcher_institute,
                -- Related persons (inventors, contributors)
                (
                    SELECT 
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
                    WHERE ipr.ip_record_id = d.ip_record_id
                    AND ipr.is_active = 1
                    FOR JSON PATH
                ) as persons,
                -- Documents
                (
                    SELECT 
                        doc.document_id,
                        doc.file_name,
                        doc.document_type,
                        doc.file_size,
                        doc.uploaded_at,
                        doc.is_confidential,
                        doc.version_number,
                        u.first_name + ' ' + u.last_name as uploaded_by_name
                    FROM documents doc
                    LEFT JOIN persons u ON doc.uploaded_by = u.person_id
                    WHERE doc.ip_record_id = d.ip_record_id
                    AND doc.is_deleted = 0
                    ORDER BY doc.uploaded_at DESC
                    FOR JSON PATH
                ) as documents,
                -- Review history
                (
                    SELECT 
                        ile.event_id,
                        ile.event_type,
                        ile.status_from,
                        ile.status_to,
                        ile.event_date,
                        ile.comments,
                        p.first_name + ' ' + p.last_name as performed_by_name
                    FROM ip_lifecycle_events ile
                    LEFT JOIN persons p ON ile.performed_by = p.person_id
                    WHERE ile.ip_record_id = d.ip_record_id
                    ORDER BY ile.event_date DESC
                    FOR JSON PATH
                ) as lifecycle_events
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            WHERE d.disclosure_id = @id AND d.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const disclosure = result.recordset[0];
        
        // Parse JSON fields
        if (disclosure.persons) {
            disclosure.persons = JSON.parse(disclosure.persons);
        }
        if (disclosure.documents) {
            disclosure.documents = JSON.parse(disclosure.documents);
        }
        if (disclosure.lifecycle_events) {
            disclosure.lifecycle_events = JSON.parse(disclosure.lifecycle_events);
        }

        return disclosure;
    }

    /**
     * Finds all disclosures for a specific researcher.
     * 
     * @async
     * @param {string} personId - The researcher's UUID
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
            WHERE ir.owner_id = @personId AND d.is_deleted = 0
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
     * @param {string} [filters.researcherId] - Filter by researcher
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
                p.employee_number as researcher_employee_number,
                i.name as researcher_institute,
                COUNT(DISTINCT doc.document_id) as document_count,
                COUNT(DISTINCT ipr.person_id) as inventor_count
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            LEFT JOIN documents doc ON doc.ip_record_id = ir.ip_record_id AND doc.is_deleted = 0
            LEFT JOIN ip_record_persons ipr ON ipr.ip_record_id = ir.ip_record_id AND ipr.is_active = 1
            WHERE d.is_deleted = 0
        `;

        const params = [];

        // Apply filters
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

        if (filters.researcherId) {
            query += ` AND p.person_id = @researcherId`;
            params.push({ name: 'researcherId', type: sql.UniqueIdentifier, value: filters.researcherId });
        }

        // Group by to handle counts
        query += `
            GROUP BY 
                d.disclosure_id, d.ip_record_id, d.disclosure_date,
                d.disclosure_category, d.novelty_description,
                d.commercialisation_potential, d.recommendation,
                d.review_status, d.created_at, d.updated_at,
                d.submitted_at, d.reviewed_at, d.reviewed_by,
                d.is_deleted,
                ir.reference_number, ir.title,
                p.first_name, p.last_name, p.email, p.employee_number,
                i.name
        `;

        // Apply sorting
        const sortBy = filters.sortBy || 'disclosure_date';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Apply pagination
        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Updates the review status of a disclosure.
     * Also records who performed the review.
     * 
     * @async
     * @param {string} disclosureId - The disclosure UUID
     * @param {string} status - New status (e.g., 'Under Review', 'Approved', 'Rejected')
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
                reviewed_by = @reviewerId, 
                reviewed_at = GETDATE(),
                ${recommendation ? 'recommendation = @recommendation,' : ''}
                updated_at = GETDATE()
            WHERE disclosure_id = @disclosureId
        `;

        const params = [
            { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId },
            { name: 'status', value: status },
            { name: 'reviewerId', type: sql.UniqueIdentifier, value: reviewerId }
        ];

        if (recommendation) {
            params.push({ name: 'recommendation', value: recommendation });
        }

        await executeQuery(query, params);

        logger.info('Disclosure status updated', { 
            disclosureId, 
            status, 
            reviewerId,
            recommendation 
        });

        return this.findById(disclosureId);
    }

    /**
     * Gets comprehensive disclosure statistics for dashboard.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object with counts and averages
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
                COUNT(CASE WHEN review_status IN ('Approved', 'Recommended') THEN 1 END) as approved_or_recommended,
                AVG(CASE 
                    WHEN reviewed_at IS NOT NULL AND created_at IS NOT NULL 
                    THEN DATEDIFF(day, created_at, reviewed_at) 
                    ELSE NULL 
                END) as avg_review_days,
                MIN(CASE 
                    WHEN reviewed_at IS NOT NULL AND created_at IS NOT NULL 
                    THEN DATEDIFF(day, created_at, reviewed_at) 
                    ELSE NULL 
                END) as min_review_days,
                MAX(CASE 
                    WHEN reviewed_at IS NOT NULL AND created_at IS NOT NULL 
                    THEN DATEDIFF(day, created_at, reviewed_at) 
                    ELSE NULL 
                END) as max_review_days,
                COUNT(CASE 
                    WHEN reviewed_at IS NOT NULL AND created_at IS NOT NULL 
                    AND DATEDIFF(day, created_at, reviewed_at) <= 30 
                    THEN 1 
                END) as reviewed_within_30_days
            FROM disclosures
            WHERE is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
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
                p.first_name + ' ' + p.last_name as researcher_name,
                p.email as researcher_email,
                i.name as researcher_institute,
                DATEDIFF(day, d.submitted_at, GETDATE()) as days_pending
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            WHERE d.review_status IN ('Submitted', 'Under Review')
            AND d.is_deleted = 0
            ORDER BY d.submitted_at ASC
        `;

        const result = await executeQuery(query);
        return result.recordset;
    }

    /**
     * Gets disclosures by category breakdown.
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
            WHERE is_deleted = 0
            AND disclosure_category IS NOT NULL
            GROUP BY disclosure_category
            ORDER BY count DESC
        `;

        const result = await executeQuery(query);
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
            WHERE is_deleted = 0
            AND created_at >= DATEADD(month, -@months, GETDATE())
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