// src/controllers/report.controller.js
/**
 * Report Controller
 * =================
 * HTTP handlers for reporting and analytics endpoints.
 * Provides:
 * - Dashboard data
 * - Report generation
 * - Data export
 * - Trend analysis
 * 
 * @module controllers/report.controller
 * @requires ../services/report.service
 * @requires ../middleware/error.middleware
 */

const reportService = require('../services/report.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Gets dashboard data based on user role.
 * 
 * @route GET /api/v1/reports/dashboard
 * @access Private - All authenticated users
 */
exports.getDashboard = catchAsync(async (req, res) => {
    const dashboard = await reportService.getDashboard(
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: dashboard
    });
});

/**
 * Gets Executive Dashboard.
 * 
 * @route GET /api/v1/reports/dashboard/executive
 * @access Private - Executive, Admin
 */
exports.getExecutiveDashboard = catchAsync(async (req, res) => {
    const dashboard = await reportService.getExecutiveDashboard();

    res.json({
        success: true,
        data: dashboard
    });
});

/**
 * Gets TTO Dashboard.
 * 
 * @route GET /api/v1/reports/dashboard/tto
 * @access Private - TTO Officer, Admin
 */
exports.getTTODashboard = catchAsync(async (req, res) => {
    const dashboard = await reportService.getTTODashboard();

    res.json({
        success: true,
        data: dashboard
    });
});

/**
 * Gets Researcher Dashboard.
 * 
 * @route GET /api/v1/reports/dashboard/researcher
 * @access Private - Researcher
 */
exports.getResearcherDashboard = catchAsync(async (req, res) => {
    const dashboard = await reportService.getResearcherDashboard(req.user.person_id);

    res.json({
        success: true,
        data: dashboard
    });
});

/**
 * Gets IP Portfolio Report.
 * 
 * @route GET /api/v1/reports/ip-portfolio
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getIpPortfolioReport = catchAsync(async (req, res) => {
    const { type, status, dateFrom, dateTo, instituteId } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (instituteId) filters.instituteId = instituteId;

    const data = await reportService.getIpPortfolioReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets Disclosure Report.
 * 
 * @route GET /api/v1/reports/disclosures
 * @access Private - TTO Officer, Admin
 */
exports.getDisclosureReport = catchAsync(async (req, res) => {
    const { status, category, dateFrom, dateTo, researcherId } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (researcherId) filters.researcherId = researcherId;

    const data = await reportService.getDisclosureReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets Patent Report.
 * 
 * @route GET /api/v1/reports/patents
 * @access Private - TTO Officer, Admin
 */
exports.getPatentReport = catchAsync(async (req, res) => {
    const { status, jurisdiction, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (jurisdiction) filters.jurisdiction = jurisdiction;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const data = await reportService.getPatentReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets Licensing Report.
 * 
 * @route GET /api/v1/reports/licensing
 * @access Private - TTO Officer, Admin, Legal, Finance
 */
exports.getLicensingReport = catchAsync(async (req, res) => {
    const { status, type, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const data = await reportService.getLicensingReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets Royalty Report.
 * 
 * @route GET /api/v1/reports/royalties
 * @access Private - Finance, Admin
 */
exports.getRoyaltyReport = catchAsync(async (req, res) => {
    const { status, dateFrom, dateTo, licenceId } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (licenceId) filters.licenceId = licenceId;

    const data = await reportService.getRoyaltyReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets Commercialisation Report.
 * 
 * @route GET /api/v1/reports/commercialisation
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getCommercialisationReport = catchAsync(async (req, res) => {
    const { status, model, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (model) filters.model = model;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const data = await reportService.getCommercialisationReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets Evaluation Report.
 * 
 * @route GET /api/v1/reports/evaluations
 * @access Private - TTO Officer, Admin
 */
exports.getEvaluationReport = catchAsync(async (req, res) => {
    const { status, evaluatorId, dateFrom, dateTo } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (evaluatorId) filters.evaluatorId = evaluatorId;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const data = await reportService.getEvaluationReport(filters);

    res.json({
        success: true,
        data: data,
        count: data.length
    });
});

/**
 * Gets IP Type Breakdown.
 * 
 * @route GET /api/v1/reports/ip-breakdown
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getIpTypeBreakdown = catchAsync(async (req, res) => {
    const { instituteId } = req.query;

    const data = await reportService.getIpTypeBreakdown(instituteId);

    res.json({
        success: true,
        data: data
    });
});

/**
 * Gets Monthly Trends.
 * 
 * @route GET /api/v1/reports/trends
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getMonthlyTrends = catchAsync(async (req, res) => {
    const { months = 12, type = 'disclosure' } = req.query;

    const data = await reportService.getMonthlyTrends(
        parseInt(months),
        type
    );

    res.json({
        success: true,
        data: data,
        months: parseInt(months),
        type: type
    });
});

/**
 * Exports report data.
 * 
 * @route GET /api/v1/reports/export
 * @access Private - TTO Officer, Admin
 */
exports.exportReport = catchAsync(async (req, res) => {
    const { type, format = 'json' } = req.query;
    const filters = req.query;

    if (!type) {
        return res.status(400).json({
            success: false,
            message: 'Report type is required'
        });
    }

    const data = await reportService.exportReport(type, filters, format);

    if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
        return res.send(data);
    }

    res.json({
        success: true,
        data: data,
        count: Array.isArray(data) ? data.length : 0,
        format: format
    });
});