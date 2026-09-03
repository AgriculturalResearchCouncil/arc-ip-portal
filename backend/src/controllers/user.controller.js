/**
 * User Controller
 * ===============
 * HTTP handlers for user management endpoints.
 * Provides REST API for:
 * - Getting all users
 * - Getting user by ID
 * - Searching users by name/email (using query string)
 * - Getting users by institute
 * - Role management (assign, remove)
 * - User activation/deactivation
 * - User statistics
 * 
 * @module controllers/user.controller
 * @requires ../database/repositories/person.repository
 * @requires ../middleware/error.middleware
 */

const personRepository = require('../database/repositories/person.repository');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Gets all users with their roles.
 * 
 * @route GET /api/v1/users
 * @access Private - Admin, TTO Officer
 */
exports.findAll = catchAsync(async (req, res) => {
    const users = await personRepository.getAllUsersWithRoles();
    
    res.json({
        success: true,
        data: users,
        count: users.length
    });
});

/**
 * Gets user by ID with roles.
 * 
 * @route GET /api/v1/users/:id
 * @access Private - Admin, TTO Officer
 */
exports.findById = catchAsync(async (req, res) => {
    const user = await personRepository.findByIdWithDetails(req.params.id);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: user
    });
});

/**
 * Searches users by name, email, or employee number.
 * 
 * @route GET /api/v1/users/search
 * @access Private - Admin, TTO Officer
 * @param {string} req.query.q - Search query (required, min 2 characters)
 * @param {number} req.query.limit - Max results (optional, default 20)
 * 
 * @example
 * GET /api/v1/users/search?q=Ncube
 * GET /api/v1/users/search?q=john&limit=10
 */
exports.search = catchAsync(async (req, res) => {
    // IMPORTANT: Get search query from req.query, NOT req.params
    const { q, limit = 20 } = req.query;
    
    // Validate search query
    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    // Search for users using the search query string
    const results = await personRepository.search(q, parseInt(limit));
    
    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

/**
 * Gets users by institute.
 * 
 * @route GET /api/v1/users/institute/:instituteId
 * @access Private - Admin, TTO Officer
 */
exports.findByInstitute = catchAsync(async (req, res) => {
    const { instituteId } = req.params;
    const users = await personRepository.findByInstitute(instituteId);
    
    res.json({
        success: true,
        data: users,
        count: users.length
    });
});

/**
 * Assigns a role to a user.
 * 
 * @route POST /api/v1/users/:id/roles
 * @access Private - Admin only
 */
exports.assignRole = catchAsync(async (req, res) => {
    const { roleName } = req.body;
    const { id } = req.params;
    
    if (!roleName) {
        return res.status(400).json({
            success: false,
            message: 'Role name is required'
        });
    }

    await personRepository.assignRole(id, roleName);
    
    logger.logAudit('ROLE_ASSIGNED', req.user.person_id, {
        targetUserId: id,
        roleName
    });

    res.json({
        success: true,
        message: `Role '${roleName}' assigned successfully`
    });
});

/**
 * Removes a role from a user.
 * 
 * @route DELETE /api/v1/users/:id/roles/:roleName
 * @access Private - Admin only
 */
exports.removeRole = catchAsync(async (req, res) => {
    const { id, roleName } = req.params;
    
    await personRepository.removeRole(id, roleName);
    
    logger.logAudit('ROLE_REMOVED', req.user.person_id, {
        targetUserId: id,
        roleName: roleName
    });

    res.json({
        success: true,
        message: `Role '${roleName}' removed successfully`
    });
});

/**
 * Deactivates a user account.
 * 
 * @route POST /api/v1/users/:id/deactivate
 * @access Private - Admin only
 */
exports.deactivate = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    await personRepository.deactivateUser(id, reason);
    
    logger.logAudit('USER_DEACTIVATED', req.user.person_id, {
        targetUserId: id,
        reason
    });

    res.json({
        success: true,
        message: 'User deactivated successfully'
    });
});

/**
 * Reactivates a user account.
 * 
 * @route POST /api/v1/users/:id/reactivate
 * @access Private - Admin only
 */
exports.reactivate = catchAsync(async (req, res) => {
    const { id } = req.params;
    
    await personRepository.reactivateUser(id);
    
    logger.logAudit('USER_REACTIVATED', req.user.person_id, {
        targetUserId: id
    });

    res.json({
        success: true,
        message: 'User reactivated successfully'
    });
});

/**
 * Gets user statistics.
 * 
 * @route GET /api/v1/users/statistics
 * @access Private - Admin, TTO Officer
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const stats = await personRepository.getStatistics();
    
    res.json({
        success: true,
        data: stats
    });
});

/**
 * Gets recently active users.
 * 
 * Note: The persons table does NOT have a last_login column,
 * so this endpoint returns an empty array with a message.
 * 
 * @route GET /api/v1/users/active
 * @access Private - Admin, TTO Officer
 */
exports.getActive = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    
    // The persons table does not have a last_login column
    res.json({
        success: true,
        data: [],
        count: 0,
        days: days,
        message: 'The persons table does not have a last_login column. This endpoint is currently disabled.'
    });
});