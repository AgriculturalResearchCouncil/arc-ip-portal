/**
 * Security Middleware
 * ===================
 * Implements security headers and protections for the API.
 * Includes:
 * - CORS configuration
 * - Security headers (Helmet)
 * - XSS protection
 * - CSRF protection
 * - Content type validation
 * 
 * @module middleware/security.middleware
 * @requires helmet
 * @requires cors
 * @requires ../config
 */

const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');

/**
 * CORS configuration.
 * Allows specified origins based on environment.
 */
const corsConfig = cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:4200',
            'http://localhost:8100',
            'https://dev.ip-portal.arc.agric.za',
            'https://staging.ip-portal.arc.agric.za',
            'https://ip.arc.agric.za'
        ];

        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) !== -1 || config.env === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin'
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400 // 24 hours
});

/**
 * Helmet security headers configuration.
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", config.auth.baseUrl],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    dnsPrefetchControl: {
        allow: false
    },
    frameguard: {
        action: 'deny'
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    xssFilter: true
});

/**
 * Content type validation middleware.
 * Ensures request content type is valid.
 */
const validateContentType = (req, res, next) => {
    // Skip validation for GET requests and file uploads
    if (req.method === 'GET' || req.method === 'DELETE' || req.path.includes('/upload')) {
        return next();
    }

    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
        return res.status(415).json({
            success: false,
            message: 'Content-Type must be application/json',
            error: {
                code: 'UNSUPPORTED_MEDIA_TYPE',
                expected: 'application/json',
                received: contentType
            }
        });
    }

    next();
};

/**
 * Request size limiter.
 * Prevents large payload attacks.
 */
const limitRequestSize = (req, res, next) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const contentLength = parseInt(req.headers['content-length'] || 0);

    if (contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            message: 'Request entity too large',
            error: {
                code: 'PAYLOAD_TOO_LARGE',
                maxSize: '10MB'
            }
        });
    }

    next();
};

/**
 * Security headers middleware for static files.
 */
const staticSecurityHeaders = (req, res, next) => {
    // Add security headers for static files
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
};

/**
 * CSRF protection middleware.
 * Validates CSRF token for state-changing requests.
 */
const csrfProtection = (req, res, next) => {
    // Skip CSRF check for GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // For development, skip CSRF check
    if (config.env === 'development') {
        return next();
    }

    // Get CSRF token from header or body
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    
    // Validate CSRF token
    // Implementation depends on CSRF token strategy
    // Could use session-based tokens or double-submit cookies
    
    // For now, we'll use a simple check
    if (!token) {
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing',
            error: {
                code: 'CSRF_TOKEN_MISSING'
            }
        });
    }

    // Validate the token (implementation depends on token strategy)
    // This is a placeholder - actual validation would check against session
    next();
};

module.exports = {
    corsConfig,
    helmetConfig,
    validateContentType,
    limitRequestSize,
    staticSecurityHeaders,
    csrfProtection
};