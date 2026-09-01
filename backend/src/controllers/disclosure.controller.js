/**
 * Disclosure Controller
 * =====================
 * Handles HTTP requests for disclosure management.
 * Provides REST API endpoints for:
 * - Creating disclosures
 * - Retrieving disclosures (all, by ID, by researcher)
 * - Submitting disclosures for review
 * - Reviewing disclosures (TTO)
 * - Getting statistics and reports
 * - Searching disclosures
 * 
 * @module controllers/disclosure.controller
 * @requires ../services/disclosure.service
 * @requires ../middleware/error.middleware
 */

const disclosureService = require('../services/disclosure.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates a new disclosure.
 * 
 * @route POST /api/v1/disclosures
 * @access Private - Researcher, TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {string} req.user.person_id - User's person ID
 * @param {Object} req.body - Disclosure data
 * @param {string} req.body.title - Disclosure title
 * @param {string} req.body.disclosureCategory - Category
 * @param {string} [req.body.noveltyDescription] - Novelty description
 * @param {string} [req.body.commercialisationPotential] - Commercial potential
 * @param {Array} [req.body.inventors] - Array of inventors
 * @param {Object} res - Express response object
 * @returns {Object} 201 Created with disclosure data
 * 
 * @example
 * POST /api/v1/disclosures
 * {
 *   "title": "Novel Pest Control Method",
 *   "disclosureCategory": "Innovation",
 *   "noveltyDescription": "New biological control method",
 *   "inventors": [
 *     { "firstName": "John", "lastName": "Doe", "email": "john@arc.agric.za" }
 *   ]
 * }
 */
exports.create = catchAsync(async (req, res) => {
    const disclosure = await disclosureService.createDisclosure(
        req.user.person_id,
        req.body
    );
    
    res.status(201).json({
        success: true,
        data: disclosure,
        message: 'Disclosure created successfully'
    });
});

/**
 * Gets all disclosures with pagination and filtering.
 * 
 * @route GET /api/v1/disclosures
 * @access Private - TTO Officer, Admin, Executive, Legal Officer
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.status] - Filter by review status
 * @param {string} [req.query.category] - Filter by category
 * @param {string} [req.query.dateFrom] - Filter from date
 * @param {string} [req.query.dateTo] - Filter to date
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=50] - Items per page
 * @param {Object} res - Express response object
 * @returns {Object} Array of disclosures with pagination
 */
exports.findAll = catchAsync(async (req, res) => {
    const { status, category, dateFrom, dateTo, page = 1, limit = 50 } = req.query;
    
    // Build filters from query parameters
    const filters = {};
    if (status) filters.reviewStatus = status;
    if (category) filters.category = category;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    // Get disclosures based on user role
    const disclosures = await disclosureService.getAllDisclosures(
        filters,
        req.user.person_id,
        req.user.role
    );

    // Get total count for pagination
    const total = await disclosureService.getStatistics();
    const totalCount = total.total || disclosures.length;

    res.json({
        success: true,
        data: disclosures,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        }
    });
});

/**
 * Gets disclosures for the current researcher.
 * 
 * @route GET /api/v1/disclosures/my
 * @access Private - Researcher only
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Object} Array of researcher's disclosures
 */
exports.findMyDisclosures = catchAsync(async (req, res) => {
    const disclosures = await disclosureService.getAllDisclosures(
        {},
        req.user.person_id,
        'Researcher'
    );

    res.json({
        success: true,
        data: disclosures
    });
});

/**
 * Gets a single disclosure by ID.
 * 
 * @route GET /api/v1/disclosures/:id
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Disclosure UUID
 * @param {Object} res - Express response object
 * @returns {Object} Disclosure object
 */
exports.findById = catchAsync(async (req, res) => {
    const disclosure = await disclosureService.getDisclosureById(req.params.id);
    
    if (!disclosure) {
        return res.status(404).json({
            success: false,
            message: 'Disclosure not found'
        });
    }

    res.json({
        success: true,
        data: disclosure
    });
});

/**
 * Submits a disclosure for TTO review.
 * 
 * @route POST /api/v1/disclosures/:id/submit
 * @access Private - Researcher only
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Disclosure UUID
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Object} Updated disclosure
 */
exports.submit = catchAsync(async (req, res) => {
    const disclosure = await disclosureService.submitDisclosure(
        req.params.id,
        req.user.person_id
    );

    res.json({
        success: true,
        data: disclosure,
        message: 'Disclosure submitted successfully'
    });
});

/**
 * Reviews a disclosure (TTO staff only).
 * 
 * @route POST /api/v1/disclosures/:id/review
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Disclosure UUID
 * @param {Object} req.body - Review data
 * @param {string} req.body.status - New status
 * @param {string} [req.body.recommendation] - Review comments
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Object} Updated disclosure
 */
exports.review = catchAsync(async (req, res) => {
    const { status, recommendation } = req.body;
    
    // Validate required fields
    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required for review'
        });
    }

    const disclosure = await disclosureService.reviewDisclosure(
        req.params.id,
        req.user.person_id,
        { status, recommendation }
    );

    res.json({
        success: true,
        data: disclosure,
        message: `Disclosure reviewed - status changed to ${status}`
    });
});

/**
 * Gets disclosure statistics.
 * 
 * @route GET /api/v1/disclosures/statistics
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Statistics object
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await disclosureService.getStatistics();
    
    // Get additional statistics
    const categoryBreakdown = await disclosureService.getCategoryBreakdown();
    const monthlyTrends = await disclosureService.getMonthlyTrends(12);
    
    res.json({
        success: true,
        data: {
            ...statistics,
            category_breakdown: categoryBreakdown,
            monthly_trends: monthlyTrends
        }
    });
});

/**
 * Gets pending disclosures for review.
 * 
 * @route GET /api/v1/disclosures/pending
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Array of pending disclosures
 */
exports.getPendingReviews = catchAsync(async (req, res) => {
    const pending = await disclosureService.getPendingReviews();
    
    res.json({
        success: true,
        data: pending,
        count: pending.length
    });
});

/**
 * Gets category breakdown of disclosures.
 * 
 * @route GET /api/v1/disclosures/categories
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Category breakdown
 */
exports.getCategoryBreakdown = catchAsync(async (req, res) => {
    const breakdown = await disclosureService.getCategoryBreakdown();
    
    res.json({
        success: true,
        data: breakdown
    });
});

/**
 * Searches disclosures by keyword.
 * 
 * @route GET /api/v1/disclosures/search
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.query.q - Search query
 * @param {Object} res - Express response object
 * @returns {Object} Array of matching disclosures
 */
exports.search = catchAsync(async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const results = await disclosureService.searchDisclosures(q);
    
    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

/**
 * Gets monthly disclosure trends.
 * 
 * @route GET /api/v1/disclosures/trends
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {number} [req.query.months=12] - Number of months
 * @param {Object} res - Express response object
 * @returns {Object} Monthly trends
 */
exports.getTrends = catchAsync(async (req, res) => {
    const months = parseInt(req.query.months) || 12;
    const trends = await disclosureService.getMonthlyTrends(months);
    
    res.json({
        success: true,
        data: trends,
        months: months
    });
});