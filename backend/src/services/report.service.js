// src/services/report.service.js
/**
 * Report Service
 * ==============
 * Business logic layer for reporting and analytics.
 * Provides:
 * - Dashboard data aggregation
 * - Report generation
 * - Data export
 * - Trend analysis
 * - Statistics compilation
 * 
 * @module services/report.service
 * @requires ../database/repositories/report.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const reportRepository = require('../database/repositories/report.repository');
const { ValidationError } = require('../errors/app-error');
const logger = require('../logging/logger');

/**
 * ReportService class containing all report business logic.
 * 
 * @class ReportService
 */
class ReportService {
    /**
     * Gets dashboard data based on user role.
     * 
     * @async
     * @param {string} userId - User UUID
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Dashboard data
     */
    async getDashboard(userId, userRole) {
        let dashboard = {};

        switch (userRole) {
            case 'Executive':
            case 'Admin':
                dashboard.executive = await reportRepository.getExecutiveDashboard();
                break;
            case 'TTO Officer':
                dashboard.tto = await reportRepository.getTTODashboard();
                break;
            case 'Researcher':
                dashboard.researcher = await reportRepository.getResearcherDashboard(userId);
                break;
            default:
                dashboard.general = await reportRepository.getTTODashboard();
        }

        // Add common metrics
        dashboard.ipTypeBreakdown = await reportRepository.getIpTypeBreakdown();

        return dashboard;
    }

    /**
     * Gets Executive Dashboard.
     * 
     * @async
     * @returns {Promise<Object>} Executive dashboard data
     */
    async getExecutiveDashboard() {
        return await reportRepository.getExecutiveDashboard();
    }

    /**
     * Gets TTO Dashboard.
     * 
     * @async
     * @returns {Promise<Object>} TTO dashboard data
     */
    async getTTODashboard() {
        return await reportRepository.getTTODashboard();
    }

    /**
     * Gets Researcher Dashboard.
     * 
     * @async
     * @param {string} userId - Researcher UUID
     * @returns {Promise<Object>} Researcher dashboard data
     */
    async getResearcherDashboard(userId) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }
        return await reportRepository.getResearcherDashboard(userId);
    }

    /**
     * Gets IP Portfolio Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} IP portfolio data
     */
    async getIpPortfolioReport(filters = {}) {
        return await reportRepository.getIpPortfolioReport(filters);
    }

    /**
     * Gets Disclosure Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} Disclosure report data
     */
    async getDisclosureReport(filters = {}) {
        return await reportRepository.getDisclosureReport(filters);
    }

    /**
     * Gets Patent Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} Patent report data
     */
    async getPatentReport(filters = {}) {
        return await reportRepository.getPatentReport(filters);
    }

    /**
     * Gets Licensing Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} Licensing report data
     */
    async getLicensingReport(filters = {}) {
        return await reportRepository.getLicensingReport(filters);
    }

    /**
     * Gets Royalty Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} Royalty report data
     */
    async getRoyaltyReport(filters = {}) {
        return await reportRepository.getRoyaltyReport(filters);
    }

    /**
     * Gets Commercialisation Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} Commercialisation report data
     */
    async getCommercialisationReport(filters = {}) {
        return await reportRepository.getCommercialisationReport(filters);
    }

    /**
     * Gets Evaluation Report.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @returns {Promise<Array>} Evaluation report data
     */
    async getEvaluationReport(filters = {}) {
        return await reportRepository.getEvaluationReport(filters);
    }

    /**
     * Gets IP Type Breakdown.
     * 
     * @async
     * @param {string} [instituteId] - Optional institute filter
     * @returns {Promise<Array>} IP type breakdown
     */
    async getIpTypeBreakdown(instituteId = null) {
        return await reportRepository.getIpTypeBreakdown(instituteId);
    }

    /**
     * Gets Monthly Trends.
     * 
     * @async
     * @param {number} [months=12] - Number of months
     * @param {string} [type='disclosure'] - Report type
     * @returns {Promise<Array>} Monthly trends
     */
    async getMonthlyTrends(months = 12, type = 'disclosure') {
        return await reportRepository.getMonthlyTrends(months, type);
    }

    /**
     * Exports report data.
     * 
     * @async
     * @param {string} reportType - Type of report
     * @param {Object} [filters] - Filter options
     * @param {string} [format='json'] - Export format
     * @returns {Promise<Array|string>} Export data
     */
    async exportReport(reportType, filters = {}, format = 'json') {
        return await reportRepository.getExportData(reportType, filters, format);
    }
}

module.exports = new ReportService();