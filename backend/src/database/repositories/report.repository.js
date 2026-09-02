/**
 * Report Repository
 * =================
 * Manages database operations for reporting and analytics.
 * Provides data for dashboards and reports.
 * 
 * Database Schema Notes:
 * - NO 'is_deleted' column in any table
 * - NO 'reviewed_at' column in disclosures (use updated_at)
 * - NO 'submitted_at' column in disclosures (use created_at)
 * - NO 'patent_jurisdictions' table
 * - Use 'institute_name' not 'name' from institutes table
 * - Disclosures table does NOT have 'title' column (use ip_records.title)
 * 
 * @module repositories/report.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * ReportRepository class for managing report data.
 * 
 * @class ReportRepository
 * @extends BaseRepository
 */
class ReportRepository extends BaseRepository {
    constructor() {
        super('ip_records', 'ip_record_id');
    }

    /**
     * Gets Executive Dashboard data.
     * High-level KPIs for executive management.
     * 
     * @async
     * @returns {Promise<Object>} Executive dashboard data
     */
    async getExecutiveDashboard() {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM ip_records) as total_ip_assets,
                (SELECT COUNT(*) FROM ip_records WHERE status IN ('Approved', 'Granted', 'Registered')) as active_ip_assets,
                (SELECT COUNT(*) FROM ip_records WHERE status = 'Draft') as draft_ip_assets,
                (SELECT COUNT(*) FROM disclosures) as total_disclosures,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Submitted') as pending_disclosures,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Approved') as approved_disclosures,
                (SELECT COUNT(*) FROM licence_records WHERE status = 'Active') as active_licences,
                (SELECT COUNT(*) FROM licence_records WHERE status = 'Active' AND end_date < GETDATE()) as overdue_licences,
                (SELECT COUNT(*) FROM commercialisation_records WHERE status = 'Active') as active_commercialisations,
                (SELECT COUNT(*) FROM commercialisation_records WHERE status = 'Completed') as completed_commercialisations,
                (SELECT COUNT(*) FROM patent_records WHERE patent_status = 'Granted') as granted_patents,
                (SELECT COUNT(*) FROM persons WHERE active = 1) as active_researchers
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Gets TTO Dashboard data.
     * Operational metrics for TTO staff.
     * 
     * @async
     * @returns {Promise<Object>} TTO dashboard data
     */
    async getTTODashboard() {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM disclosures WHERE review_status IN ('Submitted', 'Under Review')) as pending_reviews,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Under Review') as under_review,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Reviewed') as reviewed,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Recommended') as recommended,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Approved') as approved,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Rejected') as rejected,
                (SELECT COUNT(*) FROM disclosures WHERE created_at >= DATEADD(day, -30, GETDATE())) as submissions_last_30_days,
                (SELECT COUNT(*) FROM disclosures WHERE updated_at >= DATEADD(day, -30, GETDATE())) as reviews_last_30_days,
                (SELECT AVG(DATEDIFF(day, created_at, updated_at)) FROM disclosures WHERE updated_at IS NOT NULL) as avg_review_days,
                (SELECT COUNT(*) FROM licence_records WHERE status IN ('Draft', 'Under Review')) as pending_licences,
                (SELECT COUNT(*) FROM ip_records WHERE status = 'Submitted') as pending_ip_assets,
                (SELECT COUNT(*) FROM workflow_tasks WHERE task_status = 'Pending') as pending_tasks
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Gets Researcher Dashboard data.
     * Personal metrics for a specific researcher.
     * 
     * @async
     * @param {string} personId - Researcher UUID
     * @returns {Promise<Object>} Researcher dashboard data
     */
    async getResearcherDashboard(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId) as my_ip_assets,
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND status = 'Draft') as my_drafts,
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND status = 'Submitted') as my_submitted,
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND status IN ('Approved', 'Granted')) as my_approved,
                (SELECT COUNT(*) FROM disclosures WHERE ip_record_id IN (SELECT ip_record_id FROM ip_records WHERE owner_id = @personId)) as my_disclosures,
                (SELECT COUNT(*) FROM disclosures WHERE ip_record_id IN (SELECT ip_record_id FROM ip_records WHERE owner_id = @personId) AND review_status = 'Approved') as my_approved_disclosures,
                (SELECT COUNT(*) FROM documents WHERE ip_record_id IN (SELECT ip_record_id FROM ip_records WHERE owner_id = @personId)) as my_documents,
                (SELECT COUNT(*) FROM notifications WHERE person_id = @personId AND read_at IS NULL) as unread_notifications
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset[0] || {};
    }

    /**
     * Gets IP Portfolio Report.
     * Complete inventory of all IP assets.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.type] - IP type
     * @param {string} [filters.status] - IP status
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {string} [filters.instituteId] - Institute filter
     * @returns {Promise<Array>} IP portfolio data
     */
    async getIpPortfolioReport(filters = {}) {
        let query = `
            SELECT 
                ir.ip_record_id,
                ir.reference_number,
                ir.record_type,
                ir.title,
                ir.status,
                ir.created_at,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                i.institute_name as institute_name
            FROM ip_records ir
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON ir.institute_id = i.institute_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.type) {
            query += ` AND ir.record_type = @type`;
            params.push({ name: 'type', value: filters.type });
        }

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

        if (filters.instituteId) {
            query += ` AND i.institute_id = @instituteId`;
            params.push({ name: 'instituteId', type: sql.UniqueIdentifier, value: filters.instituteId });
        }

        query += ` ORDER BY ir.created_at DESC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Disclosure Report.
     * Disclosures by status, category, researcher.
     * 
     * Note: The disclosures table does NOT have a 'title' column.
     * The title comes from the ip_records table.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Review status
     * @param {string} [filters.category] - Disclosure category
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {string} [filters.researcherId] - Researcher filter
     * @returns {Promise<Array>} Disclosure report data
     */
    async getDisclosureReport(filters = {}) {
        let query = `
            SELECT 
                d.disclosure_id,
                ir.title,
                d.disclosure_category,
                d.review_status,
                d.disclosure_date,
                d.created_at as submitted_at,
                d.updated_at as reviewed_at,
                p.first_name + ' ' + p.last_name as researcher_name,
                p.email as researcher_email,
                ir.reference_number
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND d.review_status = @status`;
            params.push({ name: 'status', value: filters.status });
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
            query += ` AND ir.owner_id = @researcherId`;
            params.push({ name: 'researcherId', type: sql.UniqueIdentifier, value: filters.researcherId });
        }

        query += ` ORDER BY d.disclosure_date DESC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Export Data for Reports.
     * Exports report data in CSV or JSON format.
     * 
     * @async
     * @param {string} reportType - Type of report to export
     * @param {Object} [filters] - Filter options
     * @param {string} [format='json'] - Export format ('json', 'csv')
     * @returns {Promise<Array|string>} Export data
     */
    async getExportData(reportType, filters = {}, format = 'json') {
        let data = [];

        // Get the appropriate report data based on type
        switch (reportType) {
            case 'ip_portfolio':
                data = await this.getIpPortfolioReport(filters);
                break;
            case 'disclosure':
                data = await this.getDisclosureReport(filters);
                break;
            case 'patent':
                data = await this.getPatentReport(filters);
                break;
            case 'licensing':
                data = await this.getLicensingReport(filters);
                break;
            case 'commercialisation':
                data = await this.getCommercialisationReport(filters);
                break;
            default:
                throw new Error(`Invalid report type: ${reportType}`);
        }

        // If CSV format requested, convert to CSV
        if (format === 'csv') {
            if (data.length === 0) {
                return '';
            }
            
            // Get headers from first row
            const headers = Object.keys(data[0]);
            // Build CSV rows
            const csvRows = [
                headers.join(','), // Header row
                ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
            ];
            return csvRows.join('\n');
        }

        // Return JSON data
        return data;
    }

    /**
     * Gets Patent Report.
     * Patent status, jurisdictions, renewals.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Patent status
     * @param {string} [filters.jurisdiction] - Jurisdiction
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @returns {Promise<Array>} Patent report data
     */
    async getPatentReport(filters = {}) {
        let query = `
            SELECT 
                pr.patent_id,
                pr.application_number,
                pr.title,
                pr.patent_status,
                pr.filing_date,
                pr.grant_date,
                pr.expiry_date,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                DATEDIFF(day, GETDATE(), pr.expiry_date) as days_until_expiry
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND pr.patent_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.jurisdiction) {
            query += ` AND pr.jurisdiction = @jurisdiction`;
            params.push({ name: 'jurisdiction', value: filters.jurisdiction });
        }

        if (filters.dateFrom) {
            query += ` AND pr.filing_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND pr.filing_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY pr.filing_date DESC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Licensing Report.
     * Licences by status, revenue, licensees.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Licence status
     * @param {string} [filters.type] - Licence type
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @returns {Promise<Array>} Licensing report data
     */
    async getLicensingReport(filters = {}) {
        let query = `
            SELECT 
                lr.licence_id,
                lr.licence_number,
                lr.licensee_name,
                lr.territory,
                lr.exclusivity,
                lr.status,
                lr.start_date,
                lr.end_date,
                lr.royalty_percentage,
                lr.annual_fee,
                ir.reference_number,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND lr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.type) {
            query += ` AND lr.exclusivity = @type`;
            params.push({ name: 'type', value: filters.type });
        }

        if (filters.dateFrom) {
            query += ` AND lr.start_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND lr.start_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY lr.start_date DESC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Commercialisation Report.
     * Commercialisation projects, revenue.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Project status
     * @param {string} [filters.model] - Commercialisation model
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @returns {Promise<Array>} Commercialisation report data
     */
    async getCommercialisationReport(filters = {}) {
        let query = `
            SELECT 
                cr.commercialisation_id,
                cr.commercialisation_model,
                cr.launch_date,
                cr.target_market,
                cr.revenue_projection,
                cr.status,
                ir.reference_number,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND cr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.model) {
            query += ` AND cr.commercialisation_model = @model`;
            params.push({ name: 'model', value: filters.model });
        }

        if (filters.dateFrom) {
            query += ` AND cr.launch_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND cr.launch_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY cr.launch_date DESC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets IP Type Breakdown.
     * Count of IP assets by type.
     * 
     * @async
     * @param {string} [instituteId] - Optional institute filter
     * @returns {Promise<Array>} IP type breakdown
     */
    async getIpTypeBreakdown(instituteId = null) {
        let query = `
            SELECT 
                record_type,
                COUNT(*) as count,
                COUNT(CASE WHEN status IN ('Approved', 'Granted', 'Registered') THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_count,
                COUNT(CASE WHEN status = 'Submitted' THEN 1 END) as submitted_count
            FROM ip_records
            WHERE 1=1
        `;

        const params = [];

        if (instituteId) {
            query += ` AND EXISTS (SELECT 1 FROM persons p WHERE p.person_id = ip_records.owner_id AND p.institute_id = @instituteId)`;
            params.push({ name: 'instituteId', type: sql.UniqueIdentifier, value: instituteId });
        }

        query += ` GROUP BY record_type ORDER BY record_type`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Monthly Trends.
     * Monthly submissions and approvals.
     * 
     * @async
     * @param {number} [months=12] - Number of months to look back
     * @param {string} [type='disclosure'] - Type of record
     * @returns {Promise<Array>} Monthly trends data
     */
    async getMonthlyTrends(months = 12, type = 'disclosure') {
        let query = '';
        const params = [{ name: 'months', value: months }];

        if (type === 'disclosure') {
            query = `
                SELECT 
                    YEAR(created_at) as year,
                    MONTH(created_at) as month,
                    DATENAME(month, created_at) as month_name,
                    COUNT(*) as total,
                    COUNT(CASE WHEN review_status = 'Submitted' THEN 1 END) as submitted,
                    COUNT(CASE WHEN review_status = 'Approved' THEN 1 END) as approved,
                    COUNT(CASE WHEN review_status = 'Rejected' THEN 1 END) as rejected
                FROM disclosures
                WHERE created_at >= DATEADD(month, -@months, GETDATE())
                GROUP BY YEAR(created_at), MONTH(created_at), DATENAME(month, created_at)
                ORDER BY YEAR(created_at) DESC, MONTH(created_at) DESC
            `;
        } else if (type === 'patent') {
            query = `
                SELECT 
                    YEAR(filing_date) as year,
                    MONTH(filing_date) as month,
                    DATENAME(month, filing_date) as month_name,
                    COUNT(*) as total,
                    COUNT(CASE WHEN patent_status = 'Filed' THEN 1 END) as filed,
                    COUNT(CASE WHEN patent_status = 'Granted' THEN 1 END) as granted,
                    COUNT(CASE WHEN patent_status = 'Rejected' THEN 1 END) as rejected
                FROM patent_records
                WHERE filing_date >= DATEADD(month, -@months, GETDATE())
                GROUP BY YEAR(filing_date), MONTH(filing_date), DATENAME(month, filing_date)
                ORDER BY YEAR(filing_date) DESC, MONTH(filing_date) DESC
            `;
        } else if (type === 'licence') {
            query = `
                SELECT 
                    YEAR(start_date) as year,
                    MONTH(start_date) as month,
                    DATENAME(month, start_date) as month_name,
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                    COUNT(CASE WHEN status = 'Expired' THEN 1 END) as expired
                FROM licence_records
                WHERE start_date >= DATEADD(month, -@months, GETDATE())
                GROUP BY YEAR(start_date), MONTH(start_date), DATENAME(month, start_date)
                ORDER BY YEAR(start_date) DESC, MONTH(start_date) DESC
            `;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }
}

module.exports = new ReportRepository();