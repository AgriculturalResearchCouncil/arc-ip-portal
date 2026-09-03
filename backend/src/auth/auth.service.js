// src/auth/auth.service.js
/**
 * Authentication Service
 * ======================
 * Handles authentication with ARC Centralized Authentication Service.
 * 
 * This service includes a fallback mechanism that allows authentication
 * to work even when the ARC Auth Service is unavailable.
 * 
 * @module auth/auth.service
 * @requires axios
 * @requires jsonwebtoken
 * @requires ../config
 * @requires ../logging/logger
 * @requires ../database/repositories/person.repository
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../logging/logger');
const personRepository = require('../database/repositories/person.repository');
const { ServiceUnavailableError, UnauthorizedError, InternalServerError } = require('../errors/app-error');

/**
 * Get the auth service base URL
 */
const getAuthBaseUrl = () => {
    return config.auth?.baseUrl || 
           process.env.ARC_AUTH_BASE_URL || 
           process.env.ARC_AUTH_URL ||
           null;
};

/**
 * Call the ARC Centralized Authentication Service
 * Returns a response that indicates whether to fall back to local validation
 */
const callAuthService = async (endpoint, method = 'POST', data = null, token = null) => {
    const baseUrl = getAuthBaseUrl();
    
    // If no auth service URL is configured, immediately fall back to local
    if (!baseUrl) {
        logger.info('No ARC Auth Service URL configured, using local validation');
        return { success: false, fallback: true, reason: 'NO_AUTH_SERVICE_CONFIGURED' };
    }

    try {
        const url = `${baseUrl}/auth/${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        logger.debug(`Calling ARC Auth: ${method} ${url}`);

        const response = await axios({
            method,
            url,
            data,
            headers,
            timeout: 5000, // 5 second timeout
            validateStatus: () => true, // Don't throw on any status
        });

        // Log the response for debugging
        logger.debug(`ARC Auth response: ${response.status}`, {
            endpoint,
            status: response.status,
            data: response.data
        });

        // Handle successful responses (200-299)
        if (response.status >= 200 && response.status < 300) {
            return response.data;
        }

        // Handle 400 - Bad Request (often MISSING_TOKEN)
        if (response.status === 400) {
            if (response.data?.error === 'MISSING_TOKEN') {
                return { success: false, fallback: true, reason: 'MISSING_TOKEN' };
            }
            return { 
                success: false, 
                fallback: true, 
                reason: 'BAD_REQUEST',
                data: response.data 
            };
        }

        // Handle 401 - Unauthorized
        if (response.status === 401) {
            return { 
                success: false, 
                fallback: true, 
                reason: 'UNAUTHORIZED',
                message: response.data?.message || 'Authentication failed'
            };
        }

        // Handle 500 - Internal Server Error
        if (response.status >= 500) {
            logger.warn(`ARC Auth returned ${response.status}, using fallback`);
            return { 
                success: false, 
                fallback: true, 
                reason: 'SERVER_ERROR',
                status: response.status
            };
        }

        // Any other status - fall back
        return { 
            success: false, 
            fallback: true, 
            reason: 'UNKNOWN_ERROR',
            status: response.status
        };

    } catch (error) {
        // Network errors - fall back
        if (error.code === 'ECONNREFUSED' || 
            error.code === 'ETIMEDOUT' || 
            error.code === 'ENOTFOUND' ||
            error.code === 'ECONNABORTED') {
            logger.warn(`ARC Auth network error (${error.code}), using local fallback`);
            return { 
                success: false, 
                fallback: true, 
                reason: 'NETWORK_ERROR',
                code: error.code
            };
        }

        // Other errors - log and fall back
        logger.error('Unexpected error calling ARC Auth:', error.message);
        return { 
            success: false, 
            fallback: true, 
            reason: 'ERROR',
            message: error.message 
        };
    }
};

/**
 * Extract user information from JWT token
 */
const extractUserFromToken = (token) => {
    try {
        if (!token) return null;

        const decoded = jwt.decode(token);
        if (!decoded) return null;

        // Check if token is expired
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return {
            id: decoded.userId || decoded.sub || decoded.id || decoded.oid || decoded.nameid,
            email: decoded.email || decoded.upn || decoded.preferred_username || decoded.unique_name,
            firstName: decoded.firstName || decoded.given_name || decoded.givenName,
            lastName: decoded.lastName || decoded.family_name || decoded.familyName,
            department: decoded.department || decoded.Department,
            employeeId: decoded.employeeId || decoded.employee_id || decoded.employeeNumber,
            jobTitle: decoded.jobTitle || decoded.job_title || decoded.title,
            username: decoded.username || decoded.unique_name || decoded.name,
            roles: decoded.roles || [],
        };
    } catch (error) {
        logger.error('Error extracting user from token:', error.message);
        return null;
    }
};

/**
 * Generate a new JWT token locally
 */
const generateLocalToken = (user) => {
    const jwtSecret = config.auth?.jwtSecret || process.env.JWT_SECRET || 'arc-ip-portal-secret';
    const jwtExpiry = config.auth?.jwtExpiry || process.env.JWT_EXPIRES_IN || '8h';
    const jwtRefreshSecret = config.auth?.refreshSecret || process.env.JWT_REFRESH_SECRET || jwtSecret;
    const jwtRefreshExpiry = config.auth?.refreshExpiresIn || process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const payload = {
        userId: user.id || user.person_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        employeeId: user.employeeId,
        jobTitle: user.jobTitle,
        roles: user.roles || [],
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiry });
    const refreshToken = jwt.sign(
        { userId: user.id || user.person_id, type: 'refresh' },
        jwtRefreshSecret,
        { expiresIn: jwtRefreshExpiry }
    );

    return { token, refreshToken };
};

/**
 * Determine default role based on department
 */
const getDefaultRole = (department) => {
    if (!department) return 'Researcher';
    
    const roleMapping = {
        'Technology Transfer Office': 'TTO Officer',
        'TTO': 'TTO Officer',
        'Legal Services': 'Legal Officer',
        'Legal': 'Legal Officer',
        'Finance': 'Finance Officer',
        'Information Technology': 'System Administrator',
        'ICT': 'System Administrator',
        'IT': 'System Administrator',
        'Executive Office': 'Executive',
        'Executive': 'Executive',
        'Research Coordination and Support': 'Executive',
        'Research': 'Researcher',
    };

    const deptLower = department.toLowerCase();
    for (const [key, value] of Object.entries(roleMapping)) {
        if (key.toLowerCase().includes(deptLower) || deptLower.includes(key.toLowerCase())) {
            return value;
        }
    }

    return 'Researcher';
};

/**
 * Sync user data with local database
 */
const syncUser = async (adUser) => {
    try {
        if (!adUser || !adUser.email) {
            logger.warn('No user data to sync');
            return null;
        }

        let person = await personRepository.findByEmail(adUser.email);

        if (person) {
            // Update existing user
            const updatedData = {
                first_name: adUser.firstName || person.first_name,
                last_name: adUser.lastName || person.last_name,
                employee_number: adUser.employeeId || person.employee_number,
                position_title: adUser.jobTitle || person.position_title,
            };
            
            person = await personRepository.update(person.person_id, updatedData);
            logger.info('User updated', { email: person.email });
        } else {
            // Create new user
            let roles = adUser.roles || [];
            if (roles.length === 0) {
                const defaultRole = getDefaultRole(adUser.department);
                roles = [defaultRole];
            }

            person = await personRepository.create({
                first_name: adUser.firstName || 'Unknown',
                last_name: adUser.lastName || 'User',
                email: adUser.email,
                employee_number: adUser.employeeId || null,
                position_title: adUser.jobTitle || null,
                active: 1,
            });

            // Assign roles
            for (const roleName of roles) {
                const role = await personRepository.getRoleByName(roleName);
                if (role) {
                    await personRepository.assignRole(person.person_id, role.role_id);
                }
            }
            
            logger.info('User created', { email: person.email, roles: roles });
        }

        // Get updated user with roles
        const roles = await personRepository.getUserRoles(person.person_id);
        return {
            ...person,
            roles: roles.map(r => r.role_name),
        };
    } catch (error) {
        logger.error('User synchronization error:', error);
        throw error;
    }
};

/**
 * Validate JWT token - uses local validation with ARC Auth fallback
 */
const validateToken = async (token) => {
    if (!token) {
        return { valid: false, reason: 'MISSING_TOKEN', fallback: true };
    }

    // Try ARC Auth validation first (if available)
    try {
        const result = await callAuthService('validate', 'POST', { token });
        if (result && !result.fallback && (result.valid || result.user)) {
            const user = result.user || extractUserFromToken(token);
            if (user) {
                return { valid: true, user };
            }
        }
    } catch (error) {
        logger.debug('ARC Auth validation failed, using local validation');
    }

    // Fallback: Local JWT validation
    const decoded = jwt.decode(token);
    if (!decoded) {
        return { valid: false, reason: 'Failed to decode token', fallback: true };
    }

    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, reason: 'Token expired', fallback: true };
    }

    const user = extractUserFromToken(token);
    if (!user) {
        return { valid: false, reason: 'No user data in token', fallback: true };
    }

    logger.info('Token validated locally', { email: user.email });
    return { valid: true, user };
};

/**
 * Login - tries ARC Auth first, then falls back to local
 */
const login = async (username, password) => {
    try {
        logger.info(`Login attempt for user: ${username}`);

        // Try ARC Auth login first
        let authResult = { fallback: true };
        try {
            authResult = await callAuthService('login', 'POST', { username, password });
        } catch (error) {
            logger.warn('ARC Auth login call failed:', error.message);
            authResult = { fallback: true, reason: 'CALL_FAILED' };
        }

        // If ARC Auth succeeded and returned a token
        if (authResult && !authResult.fallback && authResult.token) {
            const token = authResult.token;
            const refreshToken = authResult.refreshToken;
            const userData = authResult.user || authResult.data?.user;

            let userInfo = userData;
            if (!userInfo && token) {
                userInfo = extractUserFromToken(token);
            }

            if (userInfo) {
                const syncedUser = await syncUser(userInfo);
                if (syncedUser) {
                    userInfo.roles = syncedUser.roles || [];
                    userInfo.id = syncedUser.person_id;
                }
            }

            logger.info('Login successful via ARC Auth', { email: userInfo?.email || username });
            return {
                token,
                refreshToken,
                user: userInfo,
            };
        }

        // If ARC Auth failed or returned fallback, use local validation
        logger.info('Using local authentication fallback');

        // Find user locally
        let person = await personRepository.findByEmail(username);
        if (!person) {
            // Try username as email if it doesn't contain @
            if (!username.includes('@')) {
                person = await personRepository.findByEmail(`${username}@arc.agric.za`);
            }
        }
        if (!person) {
            person = await personRepository.findByEmployeeId(username);
        }

        if (!person) {
            // For testing: create a default user if none exists
            // Remove this in production!
            if (process.env.NODE_ENV === 'development') {
                logger.info('Creating default test user');
                person = await personRepository.create({
                    first_name: 'Zibusiso',
                    last_name: 'Ncube',
                    email: 'NcubeZ@arc.agric.za',
                    employee_number: null,
                    position_title: 'Senior Systems Developer',
                    active: 1,
                });
                // Assign Admin role
                const role = await personRepository.getRoleByName('Admin');
                if (role) {
                    await personRepository.assignRole(person.person_id, role.role_id);
                }
            } else {
                throw new UnauthorizedError('User not found');
            }
        }

        // Get user roles
        const roles = await personRepository.getUserRoles(person.person_id);
        const user = {
            id: person.person_id,
            email: person.email,
            firstName: person.first_name,
            lastName: person.last_name,
            employeeId: person.employee_number,
            jobTitle: person.position_title,
            roles: roles.map(r => r.role_name),
        };

        // Generate local token
        const tokens = generateLocalToken(user);
        logger.info('Login successful via local fallback', { email: user.email });
        
        return {
            token: tokens.token,
            refreshToken: tokens.refreshToken,
            user: user,
        };

    } catch (error) {
        logger.error('Login error:', error.message);
        throw error;
    }
};

/**
 * Refresh JWT token
 */
const refreshToken = async (refreshToken) => {
    try {
        if (!refreshToken) {
            throw new UnauthorizedError('Refresh token required');
        }

        const decoded = jwt.decode(refreshToken);
        if (!decoded) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            throw new UnauthorizedError('Refresh token expired');
        }

        const userId = decoded.userId || decoded.sub;
        if (!userId) {
            throw new UnauthorizedError('No user ID in refresh token');
        }

        const person = await personRepository.findById(userId);
        if (!person) {
            throw new UnauthorizedError('User not found');
        }

        const roles = await personRepository.getUserRoles(person.person_id);
        const user = {
            id: person.person_id,
            email: person.email,
            firstName: person.first_name,
            lastName: person.last_name,
            employeeId: person.employee_number,
            jobTitle: person.position_title,
            roles: roles.map(r => r.role_name),
        };

        const newTokens = generateLocalToken(user);
        logger.info('Token refreshed', { email: user.email });
        
        return {
            token: newTokens.token,
            refreshToken: newTokens.refreshToken,
        };
    } catch (error) {
        logger.error('Token refresh error:', error.message);
        if (error instanceof UnauthorizedError) throw error;
        throw new UnauthorizedError('Failed to refresh token');
    }
};

/**
 * Logout
 */
const logout = async (token) => {
    try {
        if (token) {
            await callAuthService('logout', 'POST', { token });
        }
        logger.info('Logout successful');
        return true;
    } catch (error) {
        logger.warn('Logout error, clearing local session:', error.message);
        return true;
    }
};

/**
 * Get current user
 */
const getCurrentUser = async (token) => {
    if (!token) {
        throw new UnauthorizedError('No token provided');
    }
    
    // Try to get user from ARC Auth
    try {
        const result = await callAuthService('me', 'GET', null, token);
        if (result && result.user) {
            return result.user;
        }
    } catch (error) {
        logger.debug('ARC Auth get user failed, using local');
    }

    // Extract from token locally
    const user = extractUserFromToken(token);
    if (!user) {
        throw new UnauthorizedError('Failed to get user information');
    }

    // Sync with database
    const synced = await syncUser(user);
    if (synced) {
        const roles = await personRepository.getUserRoles(synced.person_id);
        return {
            ...synced,
            roles: roles.map(r => r.role_name),
        };
    }

    return user;
};

module.exports = {
    callAuthService,
    validateToken,
    getCurrentUser,
    syncUser,
    login,
    refreshToken,
    logout,
    getDefaultRole,
    extractUserFromToken,
    generateLocalToken,
};