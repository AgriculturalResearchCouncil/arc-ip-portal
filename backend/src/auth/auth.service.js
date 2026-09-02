/**
 * Authentication Service
 * ======================
 * Handles authentication with ARC Centralized Authentication Service.
 * 
 * Available ARC Auth Endpoints:
 * - POST /auth/login - Login with credentials
 * - POST /auth/logout - Logout
 * - POST /auth/validate - Validate token (if available)
 * - GET /auth/me - Get user info (if available)
 * 
 * Note: The ARC Auth Service does NOT have a /refresh endpoint.
 * Token refresh is handled by generating new tokens locally.
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
const { ServiceUnavailableError, UnauthorizedError } = require('../errors/app-error');

/**
 * Call the ARC Centralized Authentication Service
 * 
 * @param {string} endpoint - API endpoint (e.g., 'login', 'validate', 'logout')
 * @param {string} method - HTTP method (GET, POST)
 * @param {Object} data - Request body data
 * @param {string} token - Bearer token (optional)
 * @returns {Promise<Object>} Response data from auth service
 */
const callAuthService = async (endpoint, method = 'POST', data = null, token = null) => {
    try {
        const url = `${config.auth.baseUrl}/auth/${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        logger.debug('Calling auth service', { 
            url, 
            method, 
            endpoint, 
            hasToken: !!token
        });

        const response = await axios({
            method,
            url,
            data,
            headers,
            timeout: config.auth.timeout || 10000,
        });
        return response.data;
    } catch (error) {
        logger.error('Authentication service error:', {
            endpoint,
            message: error.message,
            status: error.response?.status,
            code: error.code,
            responseData: error.response?.data
        });

        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            throw new ServiceUnavailableError('Authentication service unavailable');
        }

        if (error.response) {
            throw new UnauthorizedError(
                error.response.data?.message || 'Authentication failed',
                error.response.data?.code || 'AUTH_ERROR'
            );
        }

        throw error;
    }
};

/**
 * Extract user information from JWT token
 */
const extractUserFromToken = (token) => {
    try {
        const decoded = jwt.decode(token);
        
        if (!decoded) {
            logger.warn('Failed to decode token');
            return null;
        }

        // Check if token is expired
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            logger.warn('Token expired');
            return null;
        }

        const user = {
            id: decoded.userId || decoded.sub || decoded.id || decoded.oid || decoded.nameid,
            email: decoded.email || decoded.upn || decoded.preferred_username || decoded.unique_name,
            firstName: decoded.firstName || decoded.given_name || decoded.givenName,
            lastName: decoded.lastName || decoded.family_name || decoded.familyName,
            department: decoded.department || decoded.Department,
            employeeId: decoded.employeeId || decoded.employee_id || decoded.employeeNumber,
            jobTitle: decoded.jobTitle || decoded.job_title || decoded.title,
            username: decoded.username || decoded.unique_name || decoded.name,
        };

        if (!user.email && user.username) {
            user.email = user.username;
        }

        if (!user.email) {
            logger.warn('No email found in token');
            return null;
        }

        return user;
    } catch (error) {
        logger.error('Error extracting user from token:', error.message);
        return null;
    }
};

/**
 * Generate a new JWT token locally
 * This is used when the auth service doesn't have a refresh endpoint
 */
const generateLocalToken = (user) => {
    const payload = {
        userId: user.id || user.person_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        employeeId: user.employeeId,
        jobTitle: user.jobTitle,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn || '8h',
    });

    // Generate a refresh token (just for consistency)
    const refreshToken = jwt.sign(
        { userId: user.id || user.person_id, type: 'refresh' },
        config.jwt.refreshSecret || config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn || '7d' }
    );

    return { token, refreshToken };
};

/**
 * Validate JWT token - validates locally since auth service may not have validate endpoint
 */
const validateToken = async (token) => {
    try {
        // Try to validate with ARC Auth Service first (if available)
        try {
            const result = await callAuthService('validate', 'POST', { token });
            if (result && (result.valid || result.user)) {
                const user = result.user || extractUserFromToken(token);
                if (user) {
                    logger.info('Token validated by ARC Auth');
                    return { valid: true, user: user };
                }
            }
        } catch (authError) {
            logger.warn('ARC Auth validation failed, falling back to local validation');
        }

        // Fallback: Local JWT validation
        const decoded = jwt.decode(token);
        
        if (!decoded) {
            return { valid: false, reason: 'Failed to decode token' };
        }

        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
            logger.warn('Token expired');
            return { valid: false, reason: 'Token expired' };
        }

        const user = extractUserFromToken(token);
        if (!user) {
            return { valid: false, reason: 'No user data in token' };
        }

        logger.info('Token validated locally', { email: user.email });
        return {
            valid: true,
            user: user,
        };
    } catch (error) {
        logger.error('Token validation error:', error.message);
        return { valid: false, reason: error.message };
    }
};

/**
 * Get current user information - extracts from token
 */
const getCurrentUser = async (token) => {
    const user = extractUserFromToken(token);
    if (!user) {
        throw new UnauthorizedError('Failed to get user information from token');
    }
    return user;
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
            const updatedData = {
                first_name: adUser.firstName || person.first_name,
                last_name: adUser.lastName || person.last_name,
                employee_number: adUser.employeeId || person.employee_number,
                position_title: adUser.jobTitle || person.position_title,
            };
            
            person = await personRepository.update(person.person_id, updatedData);
            logger.info('User updated', { email: person.email });
        } else {
            const defaultRole = getDefaultRole(adUser.department);
            
            person = await personRepository.create({
                first_name: adUser.firstName || 'Unknown',
                last_name: adUser.lastName || 'User',
                email: adUser.email,
                employee_number: adUser.employeeId || null,
                position_title: adUser.jobTitle || null,
                active: 1,
            });

            await personRepository.assignRole(person.person_id, defaultRole);
            logger.info('User created', { email: person.email, role: defaultRole });
        }

        return person;
    } catch (error) {
        logger.error('User synchronization error:', error);
        throw error;
    }
};

/**
 * Login using ARC Auth Service
 */
const login = async (username, password) => {
    try {
        const result = await callAuthService('login', 'POST', { username, password });
        
        const token = result.token || result.data?.token;
        const userData = result.user || result.data?.user;

        let userInfo = userData;
        if (!userInfo && token) {
            userInfo = extractUserFromToken(token);
        }

        if (userInfo) {
            await syncUser(userInfo);
        }

        return {
            token: token,
            refreshToken: result.refreshToken || result.data?.refreshToken,
            user: userInfo,
        };
    } catch (error) {
        logger.error('Login error:', error.message);
        throw error;
    }
};

/**
 * Refresh JWT token - Since ARC Auth has no /refresh endpoint,
 * we generate new tokens locally using the user from the existing token
 */
const refreshToken = async (refreshToken) => {
    try {
        // Decode the refresh token to get user info
        const decoded = jwt.decode(refreshToken);
        
        if (!decoded) {
            throw new UnauthorizedError('Invalid refresh token');
        }

        // Get user from the refresh token
        const userId = decoded.userId || decoded.sub;
        if (!userId) {
            throw new UnauthorizedError('No user ID in refresh token');
        }

        // Find the user in local database
        const person = await personRepository.findById(userId);
        if (!person) {
            throw new UnauthorizedError('User not found');
        }

        // Get user roles
        const roles = await personRepository.getUserRoles(person.person_id);
        const roleNames = roles.map(r => r.role_name);

        // Generate new tokens locally
        const user = {
            id: person.person_id,
            email: person.email,
            firstName: person.first_name,
            lastName: person.last_name,
            department: person.department,
            employeeId: person.employee_number,
            jobTitle: person.position_title,
            roles: roleNames,
        };

        const newTokens = generateLocalToken(user);
        
        logger.info('Token refreshed locally', { email: user.email });
        
        return {
            token: newTokens.token,
            refreshToken: newTokens.refreshToken,
        };
    } catch (error) {
        logger.error('Token refresh error:', error.message);
        throw new UnauthorizedError('Failed to refresh token');
    }
};

/**
 * Logout - invalidates token with ARC Auth Service
 */
const logout = async (token) => {
    try {
        // Try to logout with ARC Auth Service
        await callAuthService('logout', 'POST', { token });
        return true;
    } catch (error) {
        // If logout fails, still clear local session
        logger.warn('Logout with ARC Auth failed, clearing local session only', { error: error.message });
        return true;
    }
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
