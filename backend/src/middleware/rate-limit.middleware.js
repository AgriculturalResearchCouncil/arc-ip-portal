/**
 * Rate Limit Middleware
 * =====================
 * Implements rate limiting for API endpoints to prevent abuse.
 * Uses express-rate-limit with configurable limits.
 * 
 * @module middleware/rate-limit.middleware
 * @requires express-rate-limit
 * @requires ../config
 * @requires ../logging/logger
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../logging/logger');

/**
 * Default rate limiter configuration.
 * Applies to all API routes by default.
 */
const defaultLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        
        res.status(429).json({
            success: false,
            message: 'Too many requests from this IP, please try again later.',
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
            }
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints.
 * Lower limits to prevent brute force attacks.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 900 // 15 minutes in seconds
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            path: req.path
        });
        
        res.status(429).json({
            success: false,
            message: 'Too many authentication attempts, please try again later.',
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 900
            }
        });
    }
});

/**
 * Strict rate limiter for file uploads.
 * Prevents abuse of upload endpoints.
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
        success: false,
        message: 'Too many upload attempts, please try again later.',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 3600
        }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Upload rate limit exceeded', {
            ip: req.ip,
            path: req.path
        });
        
        res.status(429).json({
            success: false,
            message: 'Too many upload attempts, please try again later.',
            error: {
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 3600
            }
        });
    }
});

/**
 * Strict rate limiter for API endpoints.
 */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: {
        success: false,
        message: 'Too many requests, please slow down.',
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 60
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    defaultLimiter,
    authLimiter,
    uploadLimiter,
    apiLimiter
};