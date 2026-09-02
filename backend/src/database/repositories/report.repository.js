// src/database/repositories/report.repository.js
/**
 * Report Repository
 * =================
 * Manages database operations for reporting and analytics.
 * Provides data for:
 * - Executive Dashboard
 * - TTO Dashboard
 * - Researcher Dashboard
 * - IP Portfolio Reports
 * - Disclosure Reports
 * - Patent Reports
 * - Licensing Reports
 * - Royalty Reports
 * - Commercialisation Reports
 * - Evaluation Reports
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
        super('ip_records', 'ip_record_id'); // Base table for IP records
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
                (SELECT COUNT(*) FROM ip_records WHERE is_deleted = 0) as total_ip_assets,
                (SELECT COUNT(*) FROM ip_records WHERE status IN ('Approved', 'Granted', 'Registered') AND is_deleted = 0) as active_ip_assets,
                (SELECT COUNT(*) FROM ip_records WHERE status = 'Draft' AND is_deleted = 0) as draft_ip_assets,
                (SELECT COUNT(*) FROM disclosures WHERE is_deleted = 0) as total_disclosures,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Submitted' AND is_deleted = 0) as pending_disclosures,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Approved' AND is_deleted = 0) as approved_disclosures,
                (SELECT COUNT(*) FROM licence_records WHERE licence_status = 'Active' AND is_deleted = 0) as active_licences,
                (SELECT COUNT(*) FROM licence_records WHERE licence_status = 'Active' AND end_date < GETDATE() AND is_deleted = 0) as overdue_licences,
                (SELECT COUNT(*) FROM commercialisation_records WHERE status = 'Active' AND is_deleted = 0) as active_commercialisations,
                (SELECT COUNT(*) FROM commercialisation_records WHERE status = 'Completed' AND is_deleted = 0) as completed_commercialisations,
                (SELECT COUNT(*) FROM patent_records WHERE status = 'Granted' AND is_deleted = 0) as granted_patents,
                (SELECT COUNT(*) FROM patent_renewals WHERE renewal_status = 'Pending' AND renewal_due_date <= DATEADD(day, 90, GETDATE())) as pending_renewals,
                (SELECT COUNT(*) FROM persons WHERE active = 1 AND is_deleted = 0) as active_researchers
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
                (SELECT COUNT(*) FROM disclosures WHERE review_status IN ('Submitted', 'Under Review') AND is_deleted = 0) as pending_reviews,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Under Review' AND is_deleted = 0) as under_review,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Reviewed' AND is_deleted = 0) as reviewed,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Recommended' AND is_deleted = 0) as recommended,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Approved' AND is_deleted = 0) as approved,
                (SELECT COUNT(*) FROM disclosures WHERE review_status = 'Rejected' AND is_deleted = 0) as rejected,
                (SELECT COUNT(*) FROM disclosures WHERE created_at >= DATEADD(day, -30, GETDATE()) AND is_deleted = 0) as submissions_last_30_days,
                (SELECT COUNT(*) FROM disclosures WHERE reviewed_at >= DATEADD(day, -30, GETDATE()) AND is_deleted = 0) as reviews_last_30_days,
                (SELECT AVG(DATEDIFF(day, created_at, reviewed_at)) FROM disclosures WHERE reviewed_at IS NOT NULL AND is_deleted = 0) as avg_review_days,
                (SELECT COUNT(*) FROM licence_records WHERE licence_status IN ('Negotiation', 'Under Review') AND is_deleted = 0) as pending_licences,
                (SELECT COUNT(*) FROM patent_renewals WHERE renewal_status = 'Pending' AND is_deleted = 0) as pending_renewals,
                (SELECT COUNT(*) FROM ip_records WHERE status = 'Submitted' AND is_deleted = 0) as pending_ip_assets,
                (SELECT COUNT(*) FROM technology_evaluations WHERE evaluation_status = 'In Progress' AND is_deleted = 0) as in_progress_evaluations
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
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND is_deleted = 0) as my_ip_assets,
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND status = 'Draft' AND is_deleted = 0) as my_drafts,
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND status = 'Submitted' AND is_deleted = 0) as my_submitted,
                (SELECT COUNT(*) FROM ip_records WHERE owner_id = @personId AND status IN ('Approved', 'Granted') AND is_deleted = 0) as my_approved,
                (SELECT COUNT(*) FROM disclosures WHERE ip_record_id IN (SELECT ip_record_id FROM ip_records WHERE owner_id = @personId) AND is_deleted = 0) as my_disclosures,
                (SELECT COUNT(*) FROM disclosures WHERE ip_record_id IN (SELECT ip_record_id FROM ip_records WHERE owner_id = @personId) AND review_status = 'Approved' AND is_deleted = 0) as my_approved_disclosures,
                (SELECT COUNT(*) FROM documents WHERE ip_record_id IN (SELECT ip_record_id FROM ip_records WHERE owner_id = @personId) AND is_deleted = 0) as my_documents,
                (SELECT COUNT(*) FROM notifications WHERE user_id = @personId AND is_read = 0 AND is_deleted = 0) as unread_notifications
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
                i.name as institute_name,
                COUNT(DISTINCT d.document_id) as document_count,
                COUNT(DISTINCT pr.patent_id) as patent_count,
                COUNT(DISTINCT pbr.pbr_id) as pbr_count,
                COUNT(DISTINCT tm.trademark_id) as trademark_count,
                COUNT(DISTINCT cr.copyright_id) as copyright_count,
                COUNT(DISTINCT ts.trade_secret_id) as trade_secret_count,
                COUNT(DISTINCT ds.design_id) as design_count
            FROM ip_records ir
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON p.institute_id = i.institute_id
            LEFT JOIN documents d ON d.ip_record_id = ir.ip_record_id AND d.is_deleted = 0
            LEFT JOIN patent_records pr ON pr.ip_record_id = ir.ip_record_id AND pr.is_deleted = 0
            LEFT JOIN pbr_records pbr ON pbr.ip_record_id = ir.ip_record_id AND pbr.is_deleted = 0
            LEFT JOIN trademark_records tm ON tm.ip_record_id = ir.ip_record_id AND tm.is_deleted = 0
            LEFT JOIN copyright_records cr ON cr.ip_record_id = ir.ip_record_id AND cr.is_deleted = 0
            LEFT JOIN trade_secret_records ts ON ts.ip_record_id = ir.ip_record_id AND ts.is_deleted = 0
            LEFT JOIN design_records ds ON ds.ip_record_id = ir.ip_record_id AND ds.is_deleted = 0
            WHERE ir.is_deleted = 0
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
            query += ` AND p.institute_id = @instituteId`;
            params.push({ name: 'instituteId', type: sql.UniqueIdentifier, value: filters.instituteId });
        }

        query += `
            GROUP BY ir.ip_record_id, ir.reference_number, ir.record_type, ir.title,
                     ir.status, ir.created_at, p.first_name, p.last_name, p.email,
                     i.name
            ORDER BY ir.created_at DESC
        `;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Disclosure Report.
     * Disclosures by status, category, researcher.
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
                d.title,
                d.disclosure_category,
                d.review_status,
                d.disclosure_date,
                d.submitted_at,
                d.reviewed_at,
                p.first_name + ' ' + p.last_name as researcher_name,
                p.email as researcher_email,
                ir.reference_number,
                COUNT(DISTINCT ipr.person_id) as inventor_count,
                COUNT(DISTINCT doc.document_id) as document_count,
                DATEDIFF(day, d.submitted_at, d.reviewed_at) as review_days
            FROM disclosures d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN ip_record_persons ipr ON ipr.ip_record_id = ir.ip_record_id AND ipr.is_active = 1
            LEFT JOIN documents doc ON doc.ip_record_id = ir.ip_record_id AND doc.is_deleted = 0
            WHERE d.is_deleted = 0
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

        query += `
            GROUP BY d.disclosure_id, d.title, d.disclosure_category, d.review_status,
                     d.disclosure_date, d.submitted_at, d.reviewed_at,
                     p.first_name, p.last_name, p.email, ir.reference_number
            ORDER BY d.disclosure_date DESC
        `;

        const result = await executeQuery(query, params);
        return result.recordset;
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
                pr.status,
                pr.filing_date,
                pr.grant_date,
                pr.expiry_date,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT pj.jurisdiction_id) as jurisdiction_count,
                COUNT(DISTINCT prn.renewal_id) as renewal_count,
                COUNT(CASE WHEN prn.renewal_status = 'Pending' THEN 1 END) as pending_renewals,
                DATEDIFF(day, GETDATE(), pr.expiry_date) as days_until_expiry
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN patent_jurisdictions pj ON pj.patent_id = pr.patent_id
            LEFT JOIN patent_renewals prn ON prn.patent_id = pr.patent_id
            WHERE pr.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND pr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.jurisdiction) {
            query += ` AND EXISTS (SELECT 1 FROM patent_jurisdictions pj2 WHERE pj2.patent_id = pr.patent_id AND pj2.jurisdiction_code = @jurisdiction)`;
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

        query += `
            GROUP BY pr.patent_id, pr.application_number, pr.title, pr.status,
                     pr.filing_date, pr.grant_date, pr.expiry_date,
                     ir.reference_number, p.first_name, p.last_name, p.email
            ORDER BY pr.filing_date DESC
        `;

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
                lr.licence_title,
                lr.licence_type,
                lr.licence_status,
                lr.start_date,
                lr.end_date,
                ir.reference_number,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT ll.licensee_id) as licensee_count,
                STRING_AGG(ll.organisation_name, ', ') as licensee_names,
                COUNT(DISTINCT lo.obligation_id) as obligation_count,
                COUNT(CASE WHEN lo.status = 'Overdue' THEN 1 END) as overdue_obligations,
                SUM(rp.payment_amount) as total_payments,
                COUNT(DISTINCT rp.payment_id) as payment_count
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            LEFT JOIN licence_obligations lo ON lo.licence_id = lr.licence_id AND lo.is_deleted = 0
            LEFT JOIN licence_royalty_payments rp ON rp.licence_id = lr.licence_id AND rp.is_deleted = 0
            WHERE lr.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND lr.licence_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.type) {
            query += ` AND lr.licence_type = @type`;
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

        query += `
            GROUP BY lr.licence_id, lr.licence_title, lr.licence_type, lr.licence_status,
                     lr.start_date, lr.end_date, ir.reference_number, ir.title,
                     p.first_name, p.last_name, p.email
            ORDER BY lr.start_date DESC
        `;

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Royalty Report.
     * Royalty payments, due, overdue.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Payment status
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {string} [filters.licenceId] - Licence filter
     * @returns {Promise<Array>} Royalty report data
     */
    async getRoyaltyReport(filters = {}) {
        let query = `
            SELECT 
                rp.payment_id,
                rp.payment_date,
                rp.payment_amount,
                rp.payment_currency,
                rp.payment_type,
                rp.payment_status,
                rp.calculation_period_start,
                rp.calculation_period_end,
                lr.licence_title,
                lr.licence_type,
                ir.reference_number,
                STRING_AGG(ll.organisation_name, ', ') as licensee_names,
                DATEDIFF(day, rp.payment_date, GETDATE()) as days_since_payment
            FROM licence_royalty_payments rp
            JOIN licence_records lr ON rp.licence_id = lr.licence_id
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            WHERE rp.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND rp.payment_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.dateFrom) {
            query += ` AND rp.payment_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND rp.payment_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        if (filters.licenceId) {
            query += ` AND rp.licence_id = @licenceId`;
            params.push({ name: 'licenceId', type: sql.UniqueIdentifier, value: filters.licenceId });
        }

        query += `
            GROUP BY rp.payment_id, rp.payment_date, rp.payment_amount, rp.payment_currency,
                     rp.payment_type, rp.payment_status, rp.calculation_period_start,
                     rp.calculation_period_end, lr.licence_title, lr.licence_type,
                     ir.reference_number
            ORDER BY rp.payment_date DESC
        `;

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
                p.email as owner_email,
                DATEDIFF(day, cr.created_at, GETDATE()) as days_active
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.is_deleted = 0
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
     * Gets Evaluation Report.
     * Evaluation scores, recommendations.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Evaluation status
     * @param {string} [filters.evaluatorId] - Evaluator filter
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @returns {Promise<Array>} Evaluation report data
     */
    async getEvaluationReport(filters = {}) {
        let query = `
            SELECT 
                te.evaluation_id,
                te.evaluation_type,
                te.evaluation_status,
                te.overall_score,
                te.recommendation,
                te.created_at,
                d.title as disclosure_title,
                d.disclosure_category,
                p.first_name + ' ' + p.last_name as evaluator_name,
                p.email as evaluator_email,
                COUNT(DISTINCT ec.criterion_id) as criteria_count,
                AVG(ec.score) as avg_criteria_score,
                MIN(ec.score) as min_criteria_score,
                MAX(ec.score) as max_criteria_score
            FROM technology_evaluations te
            JOIN disclosures d ON te.disclosure_id = d.disclosure_id
            JOIN persons p ON te.evaluator_id = p.person_id
            LEFT JOIN evaluation_criteria ec ON ec.evaluation_id = te.evaluation_id
            WHERE te.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND te.evaluation_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.evaluatorId) {
            query += ` AND te.evaluator_id = @evaluatorId`;
            params.push({ name: 'evaluatorId', type: sql.UniqueIdentifier, value: filters.evaluatorId });
        }

        if (filters.dateFrom) {
            query += ` AND te.created_at >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND te.created_at <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += `
            GROUP BY te.evaluation_id, te.evaluation_type, te.evaluation_status,
                     te.overall_score, te.recommendation, te.created_at,
                     d.title, d.disclosure_category, p.first_name, p.last_name, p.email
            ORDER BY te.created_at DESC
        `;

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
            WHERE is_deleted = 0
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
     * @param {string} [type] - Type of record ('disclosure', 'patent', 'licence')
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
                WHERE is_deleted = 0
                AND created_at >= DATEADD(month, -@months, GETDATE())
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
                    COUNT(CASE WHEN status = 'Filed' THEN 1 END) as filed,
                    COUNT(CASE WHEN status = 'Granted' THEN 1 END) as granted,
                    COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected
                FROM patent_records
                WHERE is_deleted = 0
                AND filing_date >= DATEADD(month, -@months, GETDATE())
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
                    COUNT(CASE WHEN licence_status = 'Active' THEN 1 END) as active,
                    COUNT(CASE WHEN licence_status = 'Expired' THEN 1 END) as expired
                FROM licence_records
                WHERE is_deleted = 0
                AND start_date >= DATEADD(month, -@months, GETDATE())
                GROUP BY YEAR(start_date), MONTH(start_date), DATENAME(month, start_date)
                ORDER BY YEAR(start_date) DESC, MONTH(start_date) DESC
            `;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets Export Data for Reports.
     * 
     * @async
     * @param {string} reportType - Type of report to export
     * @param {Object} [filters] - Filter options
     * @param {string} [format='json'] - Export format ('json', 'csv')
     * @returns {Promise<Array|string>} Export data
     */
    async getExportData(reportType, filters = {}, format = 'json') {
        let data = [];

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
            case 'royalty':
                data = await this.getRoyaltyReport(filters);
                break;
            case 'commercialisation':
                data = await this.getCommercialisationReport(filters);
                break;
            case 'evaluation':
                data = await this.getEvaluationReport(filters);
                break;
            default:
                throw new Error('Invalid report type');
        }

        if (format === 'csv') {
            // Convert to CSV format
            if (data.length === 0) {
                return '';
            }
            const headers = Object.keys(data[0]);
            const csvRows = [
                headers.join(','),
                ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
            ];
            return csvRows.join('\n');
        }

        return data;
    }
}

module.exports = new ReportRepository();