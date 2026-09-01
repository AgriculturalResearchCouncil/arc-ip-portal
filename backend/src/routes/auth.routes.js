/**
 * Authentication Routes
 * =====================
 * Handles user authentication and session management.
 * Integrates with ARC Centralized Authentication Service.
 * 
 * @module routes/auth.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../auth/auth.service
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../middleware/error.middleware');
const authService = require('../auth/auth.service');
const logger = require('../logging/logger');

/**
 * @route POST /api/v1/auth/login
 * @description Authenticate user with ARC Centralized Authentication Service
 * @access Public
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.username - Username (email or employee number)
 * @param {string} req.body.password - Password
 * @returns {Object} JWT token and user info
 * 
 * @example
 * POST /api/v1/auth/login
 * {
 *   "username": "john.doe@arc.agric.za",
 *   "password": "password123"
 * }
 */
router.post('/login', catchAsync(async (req, res) => {
    const { username, password } = req.body;
    
    // Validate credentials
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    // Attempt login via ARC Auth Service
    const result = await authService.login(username, password);
    
    // Set JWT token in HTTP-only cookie for security
    res.cookie('jwt_token', result.token, {
        httpOnly: true,           // Prevents XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',          // CSRF protection
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/',
    });

    // Set refresh token if provided
    if (result.refreshToken) {
        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/',
        });
    }

    logger.info('User logged in successfully', { 
        username,
        userId: result.user?.id,
        ip: req.ip
    });

    res.json({
        success: true,
        data: {
            token: result.token,
            user: result.user,
            // Only include refresh token in response if needed by client
            refreshToken: result.refreshToken
        },
        message: 'Login successful'
    });
}));

/**
 * @route POST /api/v1/auth/logout
 * @description Logout user and clear session
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {string} req.token - JWT token from cookie or header
 * @returns {Object} Success message
 */
router.post('/logout', authenticate, catchAsync(async (req, res) => {
    // Invalidate token with ARC Auth Service
    await authService.logout(req.token);
    
    // Clear cookies
    res.clearCookie('jwt_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    logger.info('User logged out', { 
        userId: req.user?.person_id,
        ip: req.ip
    });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
}));

/**
 * @route GET /api/v1/auth/me
 * @description Get current authenticated user information
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from middleware
 * @returns {Object} Current user data
 */
router.get('/me', authenticate, catchAsync(async (req, res) => {
    // User data is already attached by auth middleware
    // Return it to the client
    res.json({
        success: true,
        data: req.user
    });
}));

/**
 * @route POST /api/v1/auth/refresh
 * @description Refresh JWT token using refresh token
 * @access Public - requires refresh token
 * @param {Object} req - Express request object
 * @param {string} req.body.refreshToken - Refresh token
 * @param {string} req.cookies.refresh_token - Refresh token from cookie (alternative)
 * @returns {Object} New JWT token
 * 
 * @example
 * POST /api/v1/auth/refresh
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/refresh', catchAsync(async (req, res) => {
    // Get refresh token from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    
    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Refresh token is required'
        });
    }

    // Refresh token with ARC Auth Service
    const result = await authService.refreshToken(refreshToken);
    
    // Update JWT token in cookie
    res.cookie('jwt_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/'
    });

    // Update refresh token if provided
    if (result.refreshToken) {
        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/'
        });
    }

    logger.info('Token refreshed', { ip: req.ip });

    res.json({
        success: true,
        data: {
            token: result.token,
            refreshToken: result.refreshToken
        }
    });
}));

/**
 * @route POST /api/v1/auth/validate
 * @description Validate a JWT token
 * @access Public - for internal service validation
 * @param {Object} req - Express request object
 * @param {string} req.body.token - JWT token to validate
 * @returns {Object} Validation result
 * 
 * @example
 * POST /api/v1/auth/validate
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 */
router.post('/validate', catchAsync(async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Token is required for validation'
        });
    }

    const result = await authService.validateToken(token);

    res.json({
        success: true,
        data: result
    });
}));

/**
 * @route GET /api/v1/auth/status
 * @description Check authentication status
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @returns {Object} Authentication status
 */
router.get('/status', authenticate, catchAsync(async (req, res) => {
    res.json({
        success: true,
        data: {
            authenticated: true,
            user: req.user,
            expiresIn: 8 * 60 * 60, // 8 hours in seconds
        }
    });
}));

module.exports = router;