/**
 * Authentication Middleware
 * =========================
 * Handles JWT token validation and user authentication.
 * 
 * Note: The ARC Auth Service does NOT have a /me endpoint.
 * We extract user information from the JWT token directly.
 * 
 * @module middleware/auth.middleware
 * @requires ../auth/auth.service
 * @requires ../database/repositories/person.repository
 * @requires ../errors/app-error
 */

const { UnauthorizedError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { validateToken, syncUser } = require('../auth/auth.service');
const personRepository = require('../database/repositories/person.repository');

/**
 * Authentication middleware - validates JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.jwt_token || 
                     req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new UnauthorizedError('Authentication required. No token provided.');
        }

        // Validate token (extracts user from token since no /me endpoint)
        const validationResult = await validateToken(token);

        if (!validationResult.valid) {
            throw new UnauthorizedError(validationResult.reason || 'Invalid or expired token');
        }

        // Get user data from validation result
        const adUser = validationResult.user;
        if (!adUser) {
            throw new UnauthorizedError('No user data in token');
        }

        // Synchronize user data with local database
        const syncedUser = await syncUser(adUser);
        if (!syncedUser) {
            throw new UnauthorizedError('User synchronization failed');
        }

        // Get user roles from local database
        const roles = await personRepository.getUserRoles(syncedUser.person_id);
        const roleNames = roles.map(r => r.role_name);

        // Attach user to request
        req.user = {
            person_id: syncedUser.person_id,
            email: syncedUser.email,
            firstName: syncedUser.first_name,
            lastName: syncedUser.last_name,
            employeeNumber: syncedUser.employee_number,
            roles: roleNames,
            role: roleNames[0] || 'Researcher', // Primary role
            isAuthenticated: true,
        };

        req.token = token;

        next();
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return next(error);
        }

        logger.error('Authentication middleware error:', error);
        next(new UnauthorizedError('Authentication failed'));
    }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            const user = req.user;

            if (!user || !user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required');
            }

            // System Administrator has all permissions
            if (user.role === 'System Administrator' || user.role === 'Admin') {
                return next();
            }

            // Check if user has any of the allowed roles
            const hasRole = allowedRoles.some(role => 
                user.roles?.some(userRole => 
                    userRole.toLowerCase() === role.toLowerCase()
                )
            );

            if (!hasRole) {
                throw new ForbiddenError('Insufficient permissions', {
                    required: allowedRoles,
                    userRoles: user.roles,
                });
            }

            next();
        } catch (error) {
            if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
                return next(error);
            }

            logger.error('Authorization middleware error:', error);
            next(new ForbiddenError('Authorization check failed'));
        }
    };
};

/**
 * Record-level authorization middleware
 */
const authorizeRecord = (entityType, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            const user = req.user;

            if (!user || !user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required');
            }

            if (user.role === 'System Administrator' || user.role === 'Admin') {
                return next();
            }

            const recordId = req.params[idParam];
            if (!recordId) {
                throw new BadRequestError('Record ID is required');
            }

            const hasAccess = await checkRecordAccess(user, entityType, recordId);

            if (!hasAccess) {
                throw new ForbiddenError('You do not have permission to access this record');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Helper function to check record-level access
 */
const checkRecordAccess = async (user, entityType, recordId) => {
    const { executeQuery, sql } = require('../database');

    if (user.role === 'Researcher') {
        switch (entityType) {
            case 'disclosure':
                const query = `
                    SELECT d.* FROM disclosures d
                    JOIN ip_records ip ON d.ip_record_id = ip.ip_record_id
                    WHERE d.disclosure_id = @recordId AND ip.owner_id = @userId
                `;
                const result = await executeQuery(query, [
                    { name: 'recordId', type: sql.UniqueIdentifier, value: recordId },
                    { name: 'userId', type: sql.UniqueIdentifier, value: user.person_id }
                ]);
                return result.recordset.length > 0;
            default:
                return false;
        }
    }

    const allowedRoles = ['TTO Officer', 'Legal Officer', 'Finance Officer', 'Executive'];
    return allowedRoles.some(role => user.roles?.includes(role));
};

/**
 * Ensure the user has a specific role
 */
const requireRole = (role) => {
    return authorize(role);
};

module.exports = {
    authenticate,
    authorize,
    authorizeRecord,
    requireRole,
};