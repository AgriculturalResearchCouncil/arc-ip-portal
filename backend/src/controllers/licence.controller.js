// src/controllers/licence.controller.js
/**
 * Licence Controller
 * ==================
 * HTTP handlers for licence management endpoints.
 * Provides REST API for:
 * - Creating licences
 * - Retrieving licences with filtering
 * - Updating licence status
 * - Managing licensees
 * - Managing royalty payments
 * - Managing obligations
 * - Managing milestones
 * - Getting statistics and reports
 * - Searching licences
 * 
 * @module controllers/licence.controller
 * @requires ../services/licence.service
 * @requires ../middleware/error.middleware
 */

const licenceService = require('../services/licence.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates a new licence for an IP record.
 * 
 * @route POST /api/v1/licences
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} req.body - Licence data
 * @param {string} req.body.ipRecordId - IP record UUID (required)
 * @param {string} req.body.licenceTitle - Licence title (required)
 * @param {string} req.body.licenceType - Licence type (required)
 * @param {string} req.body.startDate - Start date (required)
 * @param {Object} res - Express response object
 * @returns {Object} Created licence
 * 
 * @example
 * POST /api/v1/licences
 * {
 *   "ipRecordId": "123e4567-e89b-12d3-a456-426614174000",
 *   "licenceTitle": "Exclusive Licence Agreement",
 *   "licenceType": "Exclusive",
 *   "startDate": "2024-01-01",
 *   "licensees": [...]
 * }
 */
exports.create = catchAsync(async (req, res) => {
    const { ipRecordId, ...licenceData } = req.body;

    // Validate required field
    if (!ipRecordId) {
        return res.status(400).json({
            success: false,
            message: 'IP Record ID is required'
        });
    }

    // Create the licence
    const licence = await licenceService.createLicence(
        ipRecordId,
        licenceData,
        req.user.person_id
    );

    res.status(201).json({
        success: true,
        data: licence,
        message: 'Licence created successfully'
    });
});

/**
 * Gets all licences with filtering.
 * 
 * @route GET /api/v1/licences
 * @access Private - TTO Officer, Admin, Executive, Legal
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.status] - Filter by status
 * @param {string} [req.query.type] - Filter by licence type
 * @param {string} [req.query.dateFrom] - From date
 * @param {string} [req.query.dateTo] - To date
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=50] - Items per page
 * @param {Object} res - Express response object
 * @returns {Object} Array of licences with pagination
 */
exports.findAll = catchAsync(async (req, res) => {
    const { status, type, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    // Build filters from query parameters
    const filters = {};
    if (status) filters.status = status;
    if (type) filters.type = type;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    // Get licences based on user role
    const licences = await licenceService.getLicences(
        filters,
        req.user.person_id,
        req.user.role
    );

    // Get total count for pagination
    const statistics = await licenceService.getStatistics();
    const totalCount = statistics.total_licences || licences.length;

    res.json({
        success: true,
        data: licences,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        }
    });
});

/**
 * Gets licence by ID.
 * 
 * @route GET /api/v1/licences/:id
 * @access Private - TTO Officer, Admin, Executive, Legal
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {Object} res - Express response object
 * @returns {Object} Licence object with all related data
 */
exports.findById = catchAsync(async (req, res) => {
    const licence = await licenceService.getLicenceById(req.params.id);

    if (!licence) {
        return res.status(404).json({
            success: false,
            message: 'Licence not found'
        });
    }

    res.json({
        success: true,
        data: licence
    });
});

/**
 * Updates licence status.
 * 
 * @route PATCH /api/v1/licences/:id/status
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {Object} req.body - Status data
 * @param {string} req.body.status - New status
 * @param {Object} [req.body.metadata] - Additional metadata
 * @param {Object} res - Express response object
 * @returns {Object} Updated licence
 */
exports.updateStatus = catchAsync(async (req, res) => {
    const { status, metadata } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const licence = await licenceService.updateLicenceStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: licence,
        message: `Licence status updated to ${status}`
    });
});

/**
 * Records a royalty payment.
 * 
 * @route POST /api/v1/licences/:id/royalty-payments
 * @access Private - Finance, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {Object} req.body - Payment data
 * @param {number} req.body.paymentAmount - Payment amount
 * @param {string} req.body.paymentDate - Payment date
 * @param {string} [req.body.paymentType] - Payment type
 * @param {Object} res - Express response object
 * @returns {Object} Updated licence with payment record
 */
exports.recordRoyaltyPayment = catchAsync(async (req, res) => {
    const { paymentAmount, paymentDate, paymentType, ...otherData } = req.body;

    // Validate required fields
    if (!paymentAmount || !paymentDate) {
        return res.status(400).json({
            success: false,
            message: 'Payment amount and date are required'
        });
    }

    const licence = await licenceService.recordRoyaltyPayment(
        req.params.id,
        {
            paymentAmount,
            paymentDate,
            paymentType,
            ...otherData
        },
        req.user.person_id
    );

    res.json({
        success: true,
        data: licence,
        message: 'Royalty payment recorded successfully'
    });
});

/**
 * Gets royalty payment history.
 * 
 * @route GET /api/v1/licences/:id/royalty-payments
 * @access Private - Finance, Admin, TTO
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of royalty payments
 */
exports.getRoyaltyPayments = catchAsync(async (req, res) => {
    const payments = await licenceService.getRoyaltyPayments(req.params.id);

    res.json({
        success: true,
        data: payments,
        count: payments.length
    });
});

/**
 * Gets pending obligations.
 * 
 * @route GET /api/v1/licences/:id/obligations/pending
 * @access Private - TTO, Admin, Legal
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of pending obligations
 */
exports.getPendingObligations = catchAsync(async (req, res) => {
    const obligations = await licenceService.getPendingObligations(req.params.id);

    res.json({
        success: true,
        data: obligations,
        count: obligations.length
    });
});

/**
 * Updates obligation status.
 * 
 * @route PATCH /api/v1/obligations/:id/status
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Obligation UUID
 * @param {Object} req.body - Status data
 * @param {string} req.body.status - New status
 * @param {string} [req.body.notes] - Additional notes
 * @param {Object} res - Express response object
 * @returns {Object} Updated obligation
 */
exports.updateObligationStatus = catchAsync(async (req, res) => {
    const { status, notes } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const obligation = await licenceService.updateObligationStatus(
        req.params.id,
        status,
        req.user.person_id,
        notes
    );

    res.json({
        success: true,
        data: obligation,
        message: `Obligation status updated to ${status}`
    });
});

/**
 * Gets upcoming milestones.
 * 
 * @route GET /api/v1/licences/:id/milestones/upcoming
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {number} [req.query.days=30] - Days threshold
 * @param {Object} res - Express response object
 * @returns {Object} Array of upcoming milestones
 */
exports.getUpcomingMilestones = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const milestones = await licenceService.getUpcomingMilestones(req.params.id, days);

    res.json({
        success: true,
        data: milestones,
        count: milestones.length,
        daysThreshold: days
    });
});

/**
 * Updates milestone status.
 * 
 * @route PATCH /api/v1/milestones/:id/status
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Milestone UUID
 * @param {Object} req.body - Status data
 * @param {string} req.body.status - New status
 * @param {string} [req.body.proofOfAchievement] - Proof of achievement
 * @param {Object} res - Express response object
 * @returns {Object} Updated milestone
 */
exports.updateMilestoneStatus = catchAsync(async (req, res) => {
    const { status, proofOfAchievement } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const milestone = await licenceService.updateMilestoneStatus(
        req.params.id,
        status,
        req.user.person_id,
        proofOfAchievement
    );

    res.json({
        success: true,
        data: milestone,
        message: `Milestone status updated to ${status}`
    });
});

/**
 * Adds a licensee to a licence.
 * 
 * @route POST /api/v1/licences/:id/licensees
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licence UUID
 * @param {Object} req.body - Licensee data
 * @param {Object} res - Express response object
 * @returns {Object} Updated licence
 */
exports.addLicensee = catchAsync(async (req, res) => {
    const licence = await licenceService.addLicensee(
        req.params.id,
        req.body,
        req.user.person_id
    );

    res.json({
        success: true,
        data: licence,
        message: 'Licensee added successfully'
    });
});

/**
 * Removes a licensee from a licence.
 * 
 * @route DELETE /api/v1/licensees/:id
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Licensee UUID
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.removeLicensee = catchAsync(async (req, res) => {
    await licenceService.removeLicensee(req.params.id, req.user.person_id);

    res.json({
        success: true,
        message: 'Licensee removed successfully'
    });
});

/**
 * Gets licence statistics.
 * 
 * @route GET /api/v1/licences/statistics
 * @access Private - TTO, Admin, Executive
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Licence statistics
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await licenceService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Gets licences expiring soon.
 * 
 * @route GET /api/v1/licences/expiring
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {number} [req.query.days=90] - Days threshold
 * @param {Object} res - Express response object
 * @returns {Object} Array of expiring licences
 */
exports.getExpiringSoon = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 90;
    const licences = await licenceService.getExpiringSoon(days);

    res.json({
        success: true,
        data: licences,
        count: licences.length,
        daysThreshold: days
    });
});

/**
 * Searches licences.
 * 
 * @route GET /api/v1/licences/search
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.query.q - Search query
 * @param {Object} res - Express response object
 * @returns {Object} Array of matching licences
 */
exports.search = catchAsync(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const results = await licenceService.searchLicences(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

/**
 * Gets licences by IP record.
 * 
 * @route GET /api/v1/licences/ip-record/:ipRecordId
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.ipRecordId - IP record UUID
 * @param {string} [req.query.status] - Optional status filter
 * @param {Object} res - Express response object
 * @returns {Object} Array of licences
 */
exports.findByIpRecord = catchAsync(async (req, res) => {
    const { ipRecordId } = req.params;
    const { status } = req.query;

    const licences = await licenceService.getLicencesByIpRecord(ipRecordId, status);

    res.json({
        success: true,
        data: licences,
        count: licences.length
    });
});

/**
 * Gets active licences for an IP record.
 * 
 * @route GET /api/v1/licences/ip-record/:ipRecordId/active
 * @access Private - TTO, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.ipRecordId - IP record UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of active licences
 */
exports.getActiveLicences = catchAsync(async (req, res) => {
    const { ipRecordId } = req.params;
    const licences = await licenceService.getActiveLicences(ipRecordId);

    res.json({
        success: true,
        data: licences,
        count: licences.length
    });
});