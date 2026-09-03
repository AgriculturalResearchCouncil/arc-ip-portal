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
 * IMPORTANT: Route order matters! 
 * Specific routes (/search, /statistics, /active, /institute/:id) 
 * MUST be defined BEFORE the parameterized route /:id
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

// ============================================================
// SPECIFIC ROUTES (Must come BEFORE /:id)
// These routes have exact path matches that should not be
// interpreted as UUID parameters.
// ============================================================

/**
 * @route GET /api/v1/users/search
 * @description Search users by name, email, or employee number
 * @access Admin, TTO Officer
 * @param {string} req.query.q - Search query (min 2 characters)
 * @param {number} [req.query.limit=20] - Max results
 * @returns {Object} Array of matching users
 * 
 * @example
 * GET /api/v1/users/search?q=Ncube
 * GET /api/v1/users/search?q=john&limit=10
 */
router.get('/search',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
        const { q, limit = 20 } = req.query;
        
        // Validate search query
        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        // Search for users
        const results = await personRepository.search(q, parseInt(limit));
        
        res.json({
            success: true,
            data: results,
            count: results.length
        });
    })
);

/**
 * @route GET /api/v1/users/statistics
 * @description Get user statistics
 * @access Admin, TTO Officer
 * @returns {Object} User statistics (total, active, inactive)
 * 
 * @example
 * GET /api/v1/users/statistics
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
 * @returns {Object} Array of active users
 * 
 * Note: The persons table does NOT have a last_login column,
 * so this endpoint returns an empty array.
 */
router.get('/active',
    authorize('Admin', 'TTO Officer'),
    catchAsync(async (req, res) => {
        const days = parseInt(req.query.days) || 30;
        // No last_login column exists
        res.json({
            success: true,
            data: [],
            count: 0,
            days: days,
            message: 'The persons table does not have a last_login column. This endpoint is currently disabled.'
        });
    })
);

/**
 * @route GET /api/v1/users/institute/:instituteId
 * @description Get users by institute
 * @access Admin, TTO Officer
 * @param {string} req.params.instituteId - Institute UUID
 * @returns {Object} Array of users in the institute
 * 
 * @example
 * GET /api/v1/users/institute/123e4567-e89b-12d3-a456-426614174000
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

// ============================================================
// PARAMETERIZED ROUTES (Must come AFTER specific routes)
// These routes use URL parameters like :id and should only
// match after specific routes have been checked.
// ============================================================

/**
 * @route GET /api/v1/users
 * @description Get all users with their roles and institute info
 * @access Admin, TTO Officer
 * @returns {Object} Array of users with roles
 * 
 * @example
 * GET /api/v1/users
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
 * @returns {Object} User object with roles
 * 
 * @example
 * GET /api/v1/users/608AB33E-F5C4-4098-AB8F-1BA1BCE5E019
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
 * @route POST /api/v1/users/:id/roles
 * @description Assign a role to a user
 * @access Admin only
 * @param {string} req.params.id - User UUID
 * @param {string} req.body.roleName - Role name to assign
 * @returns {Object} Success message
 * 
 * @example
 * POST /api/v1/users/608AB33E-F5C4-4098-AB8F-1BA1BCE5E019/roles
 * Body: { "roleName": "TTO Officer" }
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
 * @returns {Object} Success message
 * 
 * @example
 * DELETE /api/v1/users/608AB33E-F5C4-4098-AB8F-1BA1BCE5E019/roles/TTO%20Officer
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
 * @returns {Object} Success message
 * 
 * @example
 * POST /api/v1/users/608AB33E-F5C4-4098-AB8F-1BA1BCE5E019/deactivate
 * Body: { "reason": "Employee left ARC" }
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
 * @returns {Object} Success message
 * 
 * @example
 * POST /api/v1/users/608AB33E-F5C4-4098-AB8F-1BA1BCE5E019/reactivate
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

module.exports = router;