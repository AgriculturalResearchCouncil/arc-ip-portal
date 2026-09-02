// src/controllers/patent.controller.js
/**
 * Patent Controller
 * =================
 * HTTP handlers for patent management endpoints.
 * Provides REST API for:
 * - Creating patents from disclosures
 * - Retrieving patents with filtering
 * - Updating patent status
 * - Managing renewals
 * - Patent searches
 * - Statistics and reports
 * 
 * @module controllers/patent.controller
 * @requires ../services/patent.service
 * @requires ../middleware/error.middleware
 */

const patentService = require('../services/patent.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates a patent from a disclosure.
 * 
 * @route POST /api/v1/patents
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} req.body - Patent data
 * @param {string} req.body.disclosureId - Disclosure UUID
 * @param {string} req.body.applicationNumber - Patent application number
 * @param {string} req.body.filingDate - Filing date
 * @param {string} req.body.title - Patent title
 * @param {Array} req.body.jurisdictions - Jurisdictions
 * @param {Object} res - Express response object
 * @returns {Object} Created patent
 */
exports.create = catchAsync(async (req, res) => {
    const { disclosureId, ...patentData } = req.body;
    
    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const patent = await patentService.createPatentFromDisclosure(
        disclosureId,
        patentData
    );

    res.status(201).json({
        success: true,
        data: patent,
        message: 'Patent created successfully'
    });
});

/**
 * Gets all patents with filtering.
 * 
 * @route GET /api/v1/patents
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.status] - Filter by status
 * @param {string} [req.query.jurisdiction] - Filter by jurisdiction
 * @param {string} [req.query.dateFrom] - From date
 * @param {string} [req.query.dateTo] - To date
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=50] - Items per page
 * @param {Object} res - Express response object
 * @returns {Object} Array of patents with pagination
 */
exports.findAll = catchAsync(async (req, res) => {
    const { status, jurisdiction, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (jurisdiction) filters.jurisdiction = jurisdiction;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const patents = await patentService.getPatents(
        filters,
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: patents,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: patents.length
        }
    });
});

/**
 * Gets patent by ID.
 * 
 * @route GET /api/v1/patents/:id
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Patent UUID
 * @param {Object} res - Express response object
 * @returns {Object} Patent object with full details
 */
exports.findById = catchAsync(async (req, res) => {
    const patent = await patentService.getPatentById(req.params.id);

    if (!patent) {
        return res.status(404).json({
            success: false,
            message: 'Patent not found'
        });
    }

    res.json({
        success: true,
        data: patent
    });
});

/**
 * Updates patent status.
 * 
 * @route PATCH /api/v1/patents/:id/status
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Patent UUID
 * @param {Object} req.body - Status data
 * @param {string} req.body.status - New status
 * @param {Object} [req.body.metadata] - Additional metadata
 * @param {Object} res - Express response object
 * @returns {Object} Updated patent
 */
exports.updateStatus = catchAsync(async (req, res) => {
    const { status, metadata } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const patent = await patentService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: patent,
        message: `Patent status updated to ${status}`
    });
});

/**
 * Records a patent renewal.
 * 
 * @route POST /api/v1/patents/:id/renewals
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Patent UUID
 * @param {Object} req.body - Renewal data
 * @param {string} req.body.renewalDueDate - Next renewal due date
 * @param {number} req.body.amountPaid - Amount paid
 * @param {string} req.body.paymentReference - Payment reference
 * @param {Object} res - Express response object
 * @returns {Object} Updated patent
 */
exports.recordRenewal = catchAsync(async (req, res) => {
    const { renewalDueDate, amountPaid, paymentReference } = req.body;

    if (!renewalDueDate) {
        return res.status(400).json({
            success: false,
            message: 'Renewal due date is required'
        });
    }

    const patent = await patentService.recordRenewal(
        req.params.id,
        {
            renewalDate: new Date(),
            renewalDueDate,
            amountPaid,
            paymentReference
        },
        req.user.person_id
    );

    res.json({
        success: true,
        data: patent,
        message: 'Patent renewal recorded successfully'
    });
});

/**
 * Gets patent statistics.
 * 
 * @route GET /api/v1/patents/statistics
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Patent statistics
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await patentService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Gets pending patent renewals.
 * 
 * @route GET /api/v1/patents/renewals/pending
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {number} [req.query.days=90] - Days threshold
 * @param {Object} res - Express response object
 * @returns {Object} Array of pending renewals
 */
exports.getPendingRenewals = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 90;
    const renewals = await patentService.getPendingRenewals(days);

    res.json({
        success: true,
        data: renewals,
        count: renewals.length,
        daysThreshold: days
    });
});

/**
 * Gets patents expiring soon.
 * 
 * @route GET /api/v1/patents/expiring
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {number} [req.query.days=180] - Days threshold
 * @param {Object} res - Express response object
 * @returns {Object} Array of expiring patents
 */
exports.getExpiringSoon = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 180;
    const patents = await patentService.getExpiringSoon(days);

    res.json({
        success: true,
        data: patents,
        count: patents.length,
        daysThreshold: days
    });
});

/**
 * Searches patents.
 * 
 * @route GET /api/v1/patents/search
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.query.q - Search query
 * @param {Object} res - Express response object
 * @returns {Object} Array of matching patents
 */
exports.search = catchAsync(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const results = await patentService.searchPatents(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

/**
 * Gets patent by application number.
 * 
 * @route GET /api/v1/patents/application/:number
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.number - Application number
 * @param {Object} res - Express response object
 * @returns {Object} Patent object
 */
exports.findByApplicationNumber = catchAsync(async (req, res) => {
    const patent = await patentService.findByApplicationNumber(req.params.number);

    if (!patent) {
        return res.status(404).json({
            success: false,
            message: 'Patent not found'
        });
    }

    res.json({
        success: true,
        data: patent
    });
});