/**
 * User Routes
 * ===========
 * Handles user management API endpoints.
 * Provides functionality for:
 * - User listing with roles
 * - User search
 * - Role assignment and removal
 * - User activation/deactivation
 * - Institute-based user queries
 * 
 * @module routes/user.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../database/repositories/person.repository
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { catchAsync } = require('../middleware/error.middleware');
const personRepository = require('../database/repositories/person.repository');
const logger = require('../logging/logger');

// All user routes require authentication
router.use(authenticate);

/**
 * @route GET /api/v1/users
 * @description Get all users with their roles and institute info
 * @access Admin, TTO Officer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Array of users with roles
 */
router.get('/',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
        const users = await personRepository.getAllUsersWithRoles();
        
        res.json({
            success: true,
            data: users,
            count: users.length
        });
    })
);

/**
 * @route GET /api/v1/users/:id
 * @description Get user by ID with roles
 * @access Admin, TTO Officer
 * @param {string} req.params.id - User UUID
 * @param {Object} res - Express response object
 * @returns {Object} User object with roles
 */
router.get('/:id',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
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
    })
);

/**
 * @route GET /api/v1/users/search
 * @description Search users by name, email, or employee number
 * @access Admin, TTO Officer
 * @param {string} req.query.q - Search query
 * @param {number} [req.query.limit=20] - Max results
 * @param {Object} res - Express response object
 * @returns {Object} Array of matching users
 */
router.get('/search',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
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
    })
);

/**
 * @route GET /api/v1/users/institute/:instituteId
 * @description Get users by institute
 * @access Admin, TTO Officer
 * @param {string} req.params.instituteId - Institute UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of users in the institute
 */
router.get('/institute/:instituteId',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
        const users = await personRepository.findByInstitute(req.params.instituteId);
        
        res.json({
            success: true,
            data: users,
            count: users.length
        });
    })
);

/**
 * @route POST /api/v1/users/:id/roles
 * @description Assign a role to a user
 * @access Admin only
 * @param {string} req.params.id - User UUID
 * @param {string} req.body.roleName - Role name to assign
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
router.post('/:id/roles',
    authorize('Admin'),
    catchAsync(async (req, res) => {
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
    })
);

/**
 * @route DELETE /api/v1/users/:id/roles/:roleName
 * @description Remove a role from a user
 * @access Admin only
 * @param {string} req.params.id - User UUID
 * @param {string} req.params.roleName - Role name to remove
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
router.delete('/:id/roles/:roleName',
    authorize('Admin'),
    catchAsync(async (req, res) => {
        await personRepository.removeRole(req.params.id, req.params.roleName);
        
        logger.logAudit('ROLE_REMOVED', req.user.person_id, {
            targetUserId: req.params.id,
            roleName: req.params.roleName
        });

        res.json({
            success: true,
            message: `Role '${req.params.roleName}' removed successfully`
        });
    })
);

/**
 * @route POST /api/v1/users/:id/deactivate
 * @description Deactivate a user account
 * @access Admin only
 * @param {string} req.params.id - User UUID
 * @param {string} req.body.reason - Reason for deactivation
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
router.post('/:id/deactivate',
    authorize('Admin'),
    catchAsync(async (req, res) => {
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
    })
);

/**
 * @route POST /api/v1/users/:id/reactivate
 * @description Reactivate a user account
 * @access Admin only
 * @param {string} req.params.id - User UUID
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
router.post('/:id/reactivate',
    authorize('Admin'),
    catchAsync(async (req, res) => {
        await personRepository.reactivateUser(req.params.id);
        
        logger.logAudit('USER_REACTIVATED', req.user.person_id, {
            targetUserId: req.params.id
        });

        res.json({
            success: true,
            message: 'User reactivated successfully'
        });
    })
);

/**
 * @route GET /api/v1/users/statistics
 * @description Get user statistics
 * @access Admin only
 * @param {Object} res - Express response object
 * @returns {Object} User statistics
 */
router.get('/statistics',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
        const stats = await personRepository.getStatistics();
        
        res.json({
            success: true,
            data: stats
        });
    })
);

/**
 * @route GET /api/v1/users/active
 * @description Get recently active users
 * @access Admin, TTO Officer
 * @param {number} [req.query.days=30] - Days to look back
 * @param {Object} res - Express response object
 * @returns {Object} Array of active users
 */
router.get('/active',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
        const days = parseInt(req.query.days) || 30;
        const activeUsers = await personRepository.getRecentlyActive(days);
        
        res.json({
            success: true,
            data: activeUsers,
            count: activeUsers.length,
            days: days
        });
    })
);

module.exports = router;