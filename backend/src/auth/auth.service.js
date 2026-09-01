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
            timeout: config.auth.timeout,
        });
        return response.data;
    } catch (error) {
        logger.error('Authentication service error:', {
            endpoint,
            message: error.message,
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
 */
const validateToken = async (token) => {
    try {
        const result = await callAuthService('validate', 'POST', { token });
        return {
            valid: true,
            user: result.user,
        };
    } catch (error) {
        if (error.statusCode === 401) {
            return { valid: false };
        }
        throw error;
    }
};

/**
 * Get current user information from ARC Auth
 */
const getCurrentUser = async (token) => {
    const result = await callAuthService('me', 'GET', null, token);
    return result.user;
};

/**
 * Sync user data with local database
 */
const syncUser = async (adUser) => {
    try {
        // Determine default role based on department
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

        const defaultRole = roleMapping[adUser.department] || 'Researcher';

        // Check if user exists in local database
        let person = await personRepository.findByEmail(adUser.email);

        if (person) {
            // Update existing user
            const updatedData = {
                first_name: adUser.firstName || person.first_name,
                last_name: adUser.lastName || person.last_name,
                email: adUser.email || person.email,
                employee_number: adUser.employeeId || person.employee_number,
                position_title: adUser.jobTitle || person.position_title,
                updated_at: new Date(),
            };

            person = await personRepository.update(person.person_id, updatedData);
            logger.info('User updated in local database', { email: person.email });
        } else {
            // Create new user
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
        
        // Sync user after successful login
        if (result.user) {
            await syncUser(result.user);
        }

        return {
            token: result.token,
            refreshToken: result.refreshToken,
            user: result.user,
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
            token: result.token,
            refreshToken: result.refreshToken,
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
};