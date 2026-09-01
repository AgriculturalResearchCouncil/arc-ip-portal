/**
 * User Controller
 * ===============
 * Handles HTTP requests for user management.
 * Provides REST API endpoints for:
 * - Getting all users
 * - Getting user by ID
 * - Searching users
 * - Managing user roles
 * - Activating/deactivating users
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Array of users with roles
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
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User UUID
 * @param {Object} res - Express response object
 * @returns {Object} User object with roles
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
 * @param {Object} req - Express request object
 * @param {string} req.query.q - Search query
 * @param {number} [req.query.limit=20] - Max results
 * @param {Object} res - Express response object
 * @returns {Object} Array of matching users
 */
exports.search = catchAsync(async (req, res) => {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

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
 * @param {Object} req - Express request object
 * @param {string} req.params.instituteId - Institute UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of users in the institute
 */
exports.findByInstitute = catchAsync(async (req, res) => {
    const users = await personRepository.findByInstitute(req.params.instituteId);
    
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
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User UUID
 * @param {string} req.body.roleName - Role name
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.assignRole = catchAsync(async (req, res) => {
    const { roleName } = req.body;
    
    if (!roleName) {
        return res.status(400).json({
            success: false,
            message: 'Role name is required'
        });
    }

    await personRepository.assignRole(req.params.id, roleName);
    
    logger.logAudit('ROLE_ASSIGNED', req.user.person_id, {
        targetUserId: req.params.id,
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
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User UUID
 * @param {string} req.params.roleName - Role name
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.removeRole = catchAsync(async (req, res) => {
    await personRepository.removeRole(req.params.id, req.params.roleName);
    
    logger.logAudit('ROLE_REMOVED', req.user.person_id, {
        targetUserId: req.params.id,
        roleName: req.params.roleName
    });

    res.json({
        success: true,
        message: `Role '${req.params.roleName}' removed successfully`
    });
});

/**
 * Deactivates a user account.
 * 
 * @route POST /api/v1/users/:id/deactivate
 * @access Private - Admin only
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User UUID
 * @param {string} req.body.reason - Deactivation reason
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.deactivate = catchAsync(async (req, res) => {
    const { reason } = req.body;
    
    await personRepository.deactivateUser(req.params.id, reason);
    
    logger.logAudit('USER_DEACTIVATED', req.user.person_id, {
        targetUserId: req.params.id,
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
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User UUID
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.reactivate = catchAsync(async (req, res) => {
    await personRepository.reactivateUser(req.params.id);
    
    logger.logAudit('USER_REACTIVATED', req.user.person_id, {
        targetUserId: req.params.id
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
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} User statistics
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
 * @route GET /api/v1/users/active
 * @access Private - Admin, TTO Officer
 * @param {Object} req - Express request object
 * @param {number} [req.query.days=30] - Days to look back
 * @param {Object} res - Express response object
 * @returns {Object} Array of active users
 */
exports.getActive = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const activeUsers = await personRepository.getRecentlyActive(days);
    
    res.json({
        success: true,
        data: activeUsers,
        count: activeUsers.length,
        days: days
    });
});