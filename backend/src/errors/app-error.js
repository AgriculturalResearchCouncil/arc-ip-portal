/**
 * Base application error class
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Bad Request Error (400)
 */
class BadRequestError extends AppError {
    constructor(message = 'Bad request', details = null) {
        super(message, 400, 'BAD_REQUEST', details);
    }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details = null) {
        super(message, 401, code, details);
    }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', details = null) {
        super(message, 403, 'FORBIDDEN', details);
    }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details = null) {
        super(message, 404, 'NOT_FOUND', details);
    }
}

/**
 * Validation Error (422)
 */
class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 422, 'VALIDATION_ERROR', details);
    }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
    constructor(message = 'Resource conflict', details = null) {
        super(message, 409, 'CONFLICT', details);
    }
}

/**
 * Service Unavailable Error (503)
 */
class ServiceUnavailableError extends AppError {
    constructor(message = 'Service unavailable', details = null) {
        super(message, 503, 'SERVICE_UNAVAILABLE', details);
    }
}

module.exports = {
    AppError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ServiceUnavailableError,
};