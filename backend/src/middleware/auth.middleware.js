const { UnauthorizedError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { validateToken, syncUser } = require('../auth/auth.service');
const personRepository = require('../database/repositories/person.repository');

/**
 * Authentication middleware - validates JWT token with ARC Auth Service
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from cookie or Authorization header
        const token = req.cookies?.jwt_token || 
                     req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new UnauthorizedError('Authentication required. No token provided.');
        }

        // Validate token with ARC Centralized Authentication Service
        const validationResult = await validateToken(token);

        if (!validationResult.valid) {
            throw new UnauthorizedError('Invalid or expired token');
        }

        // Synchronize user data
        const adUser = validationResult.user;
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
 * @param {...string} allowedRoles - List of roles allowed to access the route
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
 * @param {string} entityType - Type of entity (e.g., 'disclosure', 'ip_asset')
 * @param {string} idParam - Parameter name containing the record ID
 */
const authorizeRecord = (entityType, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            const user = req.user;

            if (!user || !user.isAuthenticated) {
                throw new UnauthorizedError('Authentication required');
            }

            // System Administrator has all permissions
            if (user.role === 'System Administrator' || user.role === 'Admin') {
                return next();
            }

            const recordId = req.params[idParam];

            if (!recordId) {
                throw new BadRequestError('Record ID is required');
            }

            // Check if user can access this specific record
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

    // For researchers: can only access their own records
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

    // TTO, Legal, Finance, Executive: can access all records
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