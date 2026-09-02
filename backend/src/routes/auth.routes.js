/**
 * Authentication Routes
 * =====================
 * Handles user authentication and session management.
 * Integrates with ARC Centralized Authentication Service.
 * 
 * API Endpoints:
 * - POST   /login     - Authenticate user and get JWT token
 * - POST   /logout    - Logout user and clear session
 * - GET    /me        - Get current authenticated user information
 * - POST   /refresh   - Refresh JWT token using refresh token
 * - POST   /validate  - Validate a JWT token
 * - GET    /status    - Check authentication status
 * 
 * Authentication Flow:
 * 1. User logs in with username/password via /login
 * 2. Backend validates with ARC Centralized Authentication Service
 * 3. On success, user receives JWT token and refresh token
 * 4. Token is stored in HTTP-only cookie for security
 * 5. Subsequent requests include token in Authorization header or cookie
 * 6. /me endpoint returns user data from the decoded token
 * 7. When token expires, /refresh endpoint gets a new token
 * 
 * Security Notes:
 * - JWT tokens are stored in HTTP-only cookies (prevents XSS attacks)
 * - Secure flag enabled in production (HTTPS only)
 * - SameSite=lax prevents CSRF attacks
 * - Refresh tokens expire after 7 days
 * - Access tokens expire after 8 hours
 * 
 * @module routes/auth.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../auth/auth.service
 * @requires ../logging/logger
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { catchAsync } = require('../middleware/error.middleware');
const authService = require('../auth/auth.service');
const logger = require('../logging/logger');

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

/**
 * @route POST /api/v1/auth/login
 * @description Authenticate user with ARC Centralized Authentication Service
 * @access Public
 * 
 * This endpoint validates user credentials against the ARC Centralized
 * Authentication Service. On successful authentication, it:
 * 1. Receives JWT token and refresh token from ARC Auth
 * 2. Extracts user information from the token
 * 3. Syncs user data with local database
 * 4. Sets secure HTTP-only cookies with tokens
 * 5. Returns tokens and user data to client
 * 
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.username - Username (email or employee number)
 * @param {string} req.body.password - Password
 * 
 * @returns {Object} Response with token, refresh token, and user data
 * @returns {string} token - JWT access token (valid for 8 hours)
 * @returns {string} refreshToken - Refresh token (valid for 7 days)
 * @returns {Object} user - User information (id, email, firstName, lastName, etc.)
 * 
 * @example
 * POST /api/v1/auth/login
 * Request Body:
 * {
 *   "username": "john.doe@arc.agric.za",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "user": {
 *       "id": "123e4567-e89b-12d3-a456-426614174000",
 *       "email": "john.doe@arc.agric.za",
 *       "firstName": "John",
 *       "lastName": "Doe",
 *       "department": "ICT",
 *       "employeeId": "EMP001",
 *       "jobTitle": "Developer"
 *     },
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   },
 *   "message": "Login successful"
 * }
 */
router.post('/login', catchAsync(async (req, res) => {
    const { username, password } = req.body;
    
    // Validate credentials presence
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    // Attempt login via ARC Auth Service
    const result = await authService.login(username, password);
    
    // Set JWT token in HTTP-only cookie for security
    // HTTP-only prevents JavaScript access (XSS protection)
    // Secure flag ensures cookie is only sent over HTTPS in production
    // SameSite=lax provides CSRF protection
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

    // Log successful login
    logger.info('User logged in successfully', { 
        username,
        userId: result.user?.id,
        ip: req.ip
    });

    // Return tokens and user data to client
    res.json({
        success: true,
        data: {
            token: result.token,
            user: result.user,
            refreshToken: result.refreshToken
        },
        message: 'Login successful'
    });
}));

/**
 * @route POST /api/v1/auth/logout
 * @description Logout user and clear session
 * @access Private - requires authentication
 * 
 * This endpoint:
 * 1. Invalidates token with ARC Auth Service
 * 2. Clears JWT and refresh tokens from cookies
 * 3. Logs the logout event
 * 
 * @param {Object} req - Express request object
 * @param {string} req.token - JWT token from cookie or header
 * @param {Object} req.user - Authenticated user from middleware
 * 
 * @returns {Object} Success message
 * 
 * @example
 * POST /api/v1/auth/logout
 * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
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

    // Log logout
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
 * 
 * This endpoint returns user information extracted from the JWT token.
 * The user data is attached by the authentication middleware.
 * 
 * Note: The ARC Centralized Authentication Service does not have a
 * /me endpoint, so user data is extracted directly from the JWT token.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from middleware
 * @param {string} req.user.person_id - User UUID
 * @param {string} req.user.email - User email
 * @param {string} req.user.firstName - User first name
 * @param {string} req.user.lastName - User last name
 * @param {Array} req.user.roles - User roles
 * @param {string} req.user.role - Primary role
 * 
 * @returns {Object} Current user data
 * 
 * @example
 * GET /api/v1/auth/me
 * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "person_id": "123e4567-e89b-12d3-a456-426614174000",
 *     "email": "john.doe@arc.agric.za",
 *     "firstName": "John",
 *     "lastName": "Doe",
 *     "employeeNumber": "EMP001",
 *     "roles": ["TTO Officer", "Admin"],
 *     "role": "TTO Officer",
 *     "isAuthenticated": true
 *   }
 * }
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
 * @access Public - requires refresh token (no authentication header)
 * 
 * This endpoint:
 * 1. Receives refresh token from body or cookie
 * 2. Validates refresh token with ARC Auth Service
 * 3. Returns new JWT token and refresh token
 * 4. Updates secure HTTP-only cookies
 * 
 * IMPORTANT: This endpoint does NOT require the Authorization header.
 * The refresh token itself serves as authentication.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.body.refreshToken - Refresh token (preferred)
 * @param {string} req.cookies.refresh_token - Refresh token from cookie (alternative)
 * 
 * @returns {Object} New JWT token and refresh token
 * 
 * @example
 * POST /api/v1/auth/refresh
 * Request Body:
 * {
 *   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   }
 * }
 */
router.post('/refresh', catchAsync(async (req, res) => {
    // Get refresh token from body or cookie (body preferred)
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    
    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: 'Refresh token is required'
        });
    }

    // Refresh token with ARC Auth Service
    // No Authorization header needed - the refresh token itself is the auth
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
 * 
 * This endpoint validates a JWT token by:
 * 1. Decoding the token
 * 2. Checking expiration
 * 3. Extracting user information
 * 4. Validating with ARC Auth Service (if available)
 * 
 * Used by other microservices or internal components to verify token validity.
 * 
 * @param {Object} req - Express request object
 * @param {string} req.body.token - JWT token to validate
 * 
 * @returns {Object} Validation result
 * @returns {boolean} valid - Whether the token is valid
 * @returns {Object} user - User data from token (if valid)
 * @returns {string} reason - Reason for invalidity (if invalid)
 * 
 * @example
 * POST /api/v1/auth/validate
 * Request Body:
 * {
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 * 
 * Response (Valid):
 * {
 *   "success": true,
 *   "data": {
 *     "valid": true,
 *     "user": {
 *       "id": "123e4567-e89b-12d3-a456-426614174000",
 *       "email": "john.doe@arc.agric.za",
 *       "firstName": "John",
 *       "lastName": "Doe"
 *     }
 *   }
 * }
 * 
 * Response (Invalid):
 * {
 *   "success": true,
 *   "data": {
 *     "valid": false,
 *     "reason": "Token expired"
 *   }
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
 * 
 * This endpoint checks if the current user is authenticated and
 * returns their information along with token expiry details.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user from middleware
 * 
 * @returns {Object} Authentication status
 * @returns {boolean} authenticated - Whether user is authenticated
 * @returns {Object} user - User information
 * @returns {number} expiresIn - Token expiry in seconds (8 hours = 28800 seconds)
 * 
 * @example
 * GET /api/v1/auth/status
 * Headers: { "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "authenticated": true,
 *     "user": {
 *       "person_id": "123e4567-e89b-12d3-a456-426614174000",
 *       "email": "john.doe@arc.agric.za",
 *       "firstName": "John",
 *       "lastName": "Doe"
 *     },
 *     "expiresIn": 28800
 *   }
 * }
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