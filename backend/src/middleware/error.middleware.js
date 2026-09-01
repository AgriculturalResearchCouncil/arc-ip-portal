const logger = require('../logging/logger');
const { AppError, ValidationError } = require('../errors/app-error');

/**
 * Async error wrapper
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        code: err.code,
        details: err.details,
        path: req.path,
        method: req.method,
        ip: req.ip,
    });

    // Default error
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_ERROR';
    let details = err.details || null;

    // Handle validation errors
    if (err.name === 'ValidationError' || err.name === 'ValidatorError') {
        statusCode = 422;
        message = 'Validation failed';
        code = 'VALIDATION_ERROR';
        details = err.errors || err.details;
    }

    // Handle database errors
    if (err.name === 'MSSQLError' || err.name === 'ConnectionError') {
        statusCode = 503;
        message = 'Database error occurred';
        code = 'DATABASE_ERROR';
        details = err.originalError?.message || err.message;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        code = 'INVALID_TOKEN';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        code = 'TOKEN_EXPIRED';
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            details,
            timestamp: new Date().toISOString(),
            path: req.path,
        },
    });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
    next(error);
};

module.exports = {
    catchAsync,
    errorHandler,
    notFoundHandler,
};