/**
 * IP Asset Controller
 * ===================
 * Handles HTTP requests for intellectual property asset management.
 * Provides REST API endpoints for:
 * - Creating IP assets
 * - Retrieving assets (all, by ID, by type)
 * - Updating asset status
 * - Searching assets
 * - Getting statistics
 * 
 * @module controllers/ip-asset.controller
 * @requires ../services/ip-asset.service
 * @requires ../middleware/error.middleware
 */

const ipAssetService = require('../services/ip-asset.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates a new IP asset.
 * 
 * @route POST /api/v1/ip-assets
 * @access Private - Researcher, TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} req.body - IP asset data
 * @param {string} req.body.title - Asset title
 * @param {string} req.body.recordType - IP type
 * @param {Object} res - Express response object
 * @returns {Object} 201 Created with IP asset data
 */
exports.create = catchAsync(async (req, res) => {
    const asset = await ipAssetService.createIpAsset(
        req.user.person_id,
        req.body
    );
    
    res.status(201).json({
        success: true,
        data: asset,
        message: 'IP asset created successfully'
    });
});

/**
 * Gets all IP assets with filtering.
 * 
 * @route GET /api/v1/ip-assets
 * @access Private - TTO Officer, Admin, Executive, Legal Officer
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.type] - Filter by record type
 * @param {string} [req.query.status] - Filter by status
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=50] - Items per page
 * @param {Object} res - Express response object
 * @returns {Object} Array of IP assets with pagination
 */
exports.findAll = catchAsync(async (req, res) => {
    const { type, status, page = 1, limit = 50 } = req.query;
    
    const filters = {};
    if (type) filters.type = type;
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    // If researcher, only show their own
    let assets;
    if (req.user.role === 'Researcher') {
        assets = await ipAssetService.getResearcherAssets(req.user.person_id);
    } else {
        assets = await ipAssetService.getIpAssets(filters);
    }

    res.json({
        success: true,
        data: assets,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: assets.length
        }
    });
});

/**
 * Gets researcher's own IP assets.
 * 
 * @route GET /api/v1/ip-assets/my
 * @access Private - Researcher only
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Array of researcher's assets
 */
exports.findMyAssets = catchAsync(async (req, res) => {
    const assets = await ipAssetService.getResearcherAssets(req.user.person_id);
    
    res.json({
        success: true,
        data: assets
    });
});

/**
 * Gets IP asset by ID.
 * 
 * @route GET /api/v1/ip-assets/:id
 * @access Private - TTO Officer, Admin, Executive, Legal Officer
 * @param {Object} req - Express request object
 * @param {string} req.params.id - IP asset UUID
 * @param {Object} res - Express response object
 * @returns {Object} IP asset object
 */
exports.findById = catchAsync(async (req, res) => {
    const asset = await ipAssetService.getIpAssetById(req.params.id);
    
    if (!asset) {
        return res.status(404).json({
            success: false,
            message: 'IP asset not found'
        });
    }

    res.json({
        success: true,
        data: asset
    });
});

/**
 * Updates IP asset status.
 * 
 * @route PATCH /api/v1/ip-assets/:id/status
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - IP asset UUID
 * @param {Object} req.body - Update data
 * @param {string} req.body.status - New status
 * @param {string} [req.body.comment] - Status change comment
 * @param {Object} res - Express response object
 * @returns {Object} Updated IP asset
 */
exports.updateStatus = catchAsync(async (req, res) => {
    const { status, comment } = req.body;
    
    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const asset = await ipAssetService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        comment
    );

    res.json({
        success: true,
        data: asset,
        message: `Status updated to ${status}`
    });
});

/**
 * Gets IP asset statistics.
 * 
 * @route GET /api/v1/ip-assets/statistics
 * @access Private - TTO Officer, Admin, Executive
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Statistics object
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await ipAssetService.getStatistics();
    
    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Gets pending IP assets for review.
 * 
 * @route GET /api/v1/ip-assets/pending
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} [req.query.type] - Filter by record type
 * @param {Object} res - Express response object
 * @returns {Object} Array of pending assets
 */
exports.getPending = catchAsync(async (req, res) => {
    const { type } = req.query;
    const pending = await ipAssetService.getPendingAssets(type);
    
    res.json({
        success: true,
        data: pending,
        count: pending.length
    });
});

/**
 * Searches IP assets.
 * 
 * @route GET /api/v1/ip-assets/search
 * @access Private - TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.query.q - Search query
 * @param {Object} res - Express response object
 * @returns {Object} Array of matching assets
 */
exports.search = catchAsync(async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const results = await ipAssetService.search(q);
    
    res.json({
        success: true,
        data: results,
        count: results.length
    });
});