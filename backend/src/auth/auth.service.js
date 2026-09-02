/**
 * Authentication Service
 * ======================
 * Handles authentication with ARC Centralized Authentication Service.
 * Provides login, token validation, refresh, and user synchronization.
 * 
 * @module auth/auth.service
 * @requires axios
 * @requires ../config
 * @requires ../logging/logger
 * @requires ../database/repositories/person.repository
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../logging/logger');
const personRepository = require('../database/repositories/person.repository');
const { ServiceUnavailableError, UnauthorizedError } = require('../errors/app-error');

/**
 * Call the ARC Centralized Authentication Service
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
        });

        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            throw new ServiceUnavailableError('Authentication service unavailable');
        }

        if (error.response) {
            throw new UnauthorizedError(
                error.response.data?.message || 'Authentication failed',
                error.response.data?.code
            );
        }

        throw error;
    }
};

/**
 * Validate JWT token with ARC Auth Service
 * If validation fails, try to decode the token locally as fallback
 */
const validateToken = async (token) => {
    try {
        // Try to validate with ARC Auth Service
        const result = await callAuthService('validate', 'POST', { token });
        return {
            valid: true,
            user: result.user || result.data?.user,
        };
    } catch (error) {
        // If auth service returns 400 or 401, token is invalid
        if (error.statusCode === 400 || error.statusCode === 401 || error.response?.status === 400 || error.response?.status === 401) {
            logger.warn('Token validation failed with auth service', { status: error.statusCode || error.response?.status });
            return { valid: false };
        }
        
        // For other errors, try local validation as fallback
        logger.warn('Auth service validation failed, trying local validation', { error: error.message });
        
        try {
            // Try to decode the token locally (simple validation)
            const decoded = Buffer.from(token.split('.')[1], 'base64').toString();
            const payload = JSON.parse(decoded);
            
            // Check if token is expired
            if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
                return { valid: false };
            }
            
            // Return user data from token payload
            return {
                valid: true,
                user: {
                    id: payload.userId || payload.sub || payload.id,
                    email: payload.email,
                    firstName: payload.firstName || payload.given_name,
                    lastName: payload.lastName || payload.family_name,
                    department: payload.department,
                    employeeId: payload.employeeId,
                    jobTitle: payload.jobTitle,
                }
            };
        } catch (decodeError) {
            logger.warn('Local token validation failed', { error: decodeError.message });
            return { valid: false };
        }
    }
};

/**
 * Get current user information from ARC Auth
 */
const getCurrentUser = async (token) => {
    try {
        const result = await callAuthService('me', 'GET', null, token);
        return result.user || result.data?.user;
    } catch (error) {
        logger.error('Error getting current user:', error.message);
        throw new UnauthorizedError('Failed to get user information');
    }
};

/**
 * Determine default role based on department
 */
const getDefaultRole = (department) => {
    const roleMapping = {
        'Technology Transfer Office': 'TTO Officer',
        'Technology Transfer Office (TTO)': 'TTO Officer',
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

    return roleMapping[department] || 'Researcher';
};

/**
 * Sync user data with local database
 */
const syncUser = async (adUser) => {
    try {
        // Check if user exists in local database
        let person = await personRepository.findByEmail(adUser.email);

        if (person) {
            // Update existing user
            const updatedData = {
                first_name: adUser.firstName || person.first_name,
                last_name: adUser.lastName || person.last_name,
                employee_number: adUser.employeeId || person.employee_number,
                position_title: adUser.jobTitle || person.position_title,
            };
            
            // Only update if data has changed
            person = await personRepository.update(person.person_id, updatedData);
            logger.info('User updated in local database', { email: person.email });
        } else {
            // Create new user
            const defaultRole = getDefaultRole(adUser.department);
            
            person = await personRepository.create({
                first_name: adUser.firstName || 'Unknown',
                last_name: adUser.lastName || 'User',
                email: adUser.email,
                employee_number: adUser.employeeId || null,
                position_title: adUser.jobTitle || null,
                active: 1,
            });

            // Assign default role
            await personRepository.assignRole(person.person_id, defaultRole);
            logger.info('User created in local database', { 
                email: person.email, 
                role: defaultRole 
            });
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
        
        // Extract user data from response
        const userData = result.user || result.data?.user;
        
        if (userData) {
            // Sync user to local database
            await syncUser(userData);
        }

        return {
            token: result.token || result.data?.token,
            refreshToken: result.refreshToken || result.data?.refreshToken,
            user: userData,
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
        const result = await callAuthService('refresh', 'POST', { refreshToken });
        return {
            token: result.token || result.data?.token,
            refreshToken: result.refreshToken || result.data?.refreshToken,
        };
    } catch (error) {
        logger.error('Token refresh error:', error.message);
        throw error;
    }
};

/**
 * Logout
 */
const logout = async (token) => {
    try {
        await callAuthService('logout', 'POST', { token });
        return true;
    } catch (error) {
        logger.error('Logout error:', error.message);
        return false;
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
};