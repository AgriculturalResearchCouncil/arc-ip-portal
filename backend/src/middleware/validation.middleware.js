/**
 * Validation Middleware
 * =====================
 * Provides request validation using Joi schemas.
 * Validates request body, query parameters, and URL parameters.
 * Returns detailed validation errors for client feedback.
 * 
 * @module middleware/validation.middleware
 * @requires joi
 * @requires ../errors/app-error
 */

const Joi = require('joi');
const { ValidationError } = require('../errors/app-error');
const logger = require('../logging/logger');

/**
 * Creates a validation middleware for the given Joi schema.
 * 
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} [source='body'] - Request part to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Define a schema
 * const createUserSchema = Joi.object({
 *   firstName: Joi.string().required(),
 *   lastName: Joi.string().required(),
 *   email: Joi.string().email().required(),
 * });
 * 
 * // Use in route
 * router.post('/users', validate(createUserSchema), userController.create);
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            // Get the data to validate from the specified source
            let dataToValidate;
            switch (source) {
                case 'body':
                    dataToValidate = req.body;
                    break;
                case 'query':
                    dataToValidate = req.query;
                    break;
                case 'params':
                    dataToValidate = req.params;
                    break;
                default:
                    dataToValidate = req.body;
            }

            // Validate data against schema
            const { error, value } = schema.validate(dataToValidate, {
                abortEarly: false,           // Return all errors, not just the first one
                stripUnknown: true,           // Remove fields not in the schema
                allowUnknown: false,          // Don't allow fields not in the schema
            });

            if (error) {
                // Format validation errors into a user-friendly structure
                const errors = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    type: detail.type
                }));

                logger.warn('Validation failed', {
                    source,
                    errors,
                    path: req.path,
                    method: req.method
                });

                throw new ValidationError('Validation failed', errors);
            }

            // Replace the original data with validated (and sanitized) data
            switch (source) {
                case 'body':
                    req.body = value;
                    break;
                case 'query':
                    req.query = value;
                    break;
                case 'params':
                    req.params = value;
                    break;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Validation schemas for common operations.
 */
const schemas = {
    /**
     * User-related validation schemas
     */
    user: {
        /**
         * Schema for creating a new user
         */
        create: Joi.object({
            firstName: Joi.string().min(2).max(100).required().messages({
                'string.empty': 'First name is required',
                'string.min': 'First name must be at least 2 characters',
                'string.max': 'First name cannot exceed 100 characters'
            }),
            lastName: Joi.string().min(2).max(100).required().messages({
                'string.empty': 'Last name is required',
                'string.min': 'Last name must be at least 2 characters',
                'string.max': 'Last name cannot exceed 100 characters'
            }),
            email: Joi.string().email().required().messages({
                'string.email': 'Invalid email format',
                'string.empty': 'Email is required'
            }),
            employeeNumber: Joi.string().max(50).allow(null, ''),
            positionTitle: Joi.string().max(200).allow(null, ''),
            instituteId: Joi.string().uuid().allow(null, ''),
            active: Joi.boolean().default(true)
        }),

        /**
         * Schema for updating a user
         */
        update: Joi.object({
            firstName: Joi.string().min(2).max(100),
            lastName: Joi.string().min(2).max(100),
            email: Joi.string().email(),
            employeeNumber: Joi.string().max(50).allow(null, ''),
            positionTitle: Joi.string().max(200).allow(null, ''),
            instituteId: Joi.string().uuid().allow(null, ''),
            active: Joi.boolean()
        }).min(1) // At least one field to update
    },

    /**
     * Disclosure-related validation schemas
     */
    disclosure: {
        /**
         * Schema for creating a disclosure
         */
        create: Joi.object({
            title: Joi.string().min(5).max(500).required().messages({
                'string.empty': 'Title is required',
                'string.min': 'Title must be at least 5 characters',
                'string.max': 'Title cannot exceed 500 characters'
            }),
            disclosureCategory: Joi.string().required().messages({
                'string.empty': 'Disclosure category is required'
            }),
            noveltyDescription: Joi.string().max(2000).allow(null, ''),
            commercialisationPotential: Joi.string().max(2000).allow(null, ''),
            confidentialityLevel: Joi.string().valid('Public', 'Confidential', 'Highly Confidential').default('Confidential'),
            disclosureDate: Joi.date().iso().allow(null),
            inventors: Joi.array().items(
                Joi.object({
                    firstName: Joi.string().required(),
                    lastName: Joi.string().required(),
                    email: Joi.string().email().required(),
                    employeeNumber: Joi.string().allow(null, ''),
                    positionTitle: Joi.string().allow(null, ''),
                    contributionPercentage: Joi.number().min(0).max(100).allow(null)
                })
            )
        }),

        /**
         * Schema for updating a disclosure
         */
        update: Joi.object({
            title: Joi.string().min(5).max(500),
            disclosureCategory: Joi.string(),
            noveltyDescription: Joi.string().max(2000).allow(null, ''),
            commercialisationPotential: Joi.string().max(2000).allow(null, ''),
            confidentialityLevel: Joi.string().valid('Public', 'Confidential', 'Highly Confidential')
        }).min(1),

        /**
         * Schema for reviewing a disclosure
         */
        review: Joi.object({
            status: Joi.string().valid('Under Review', 'Reviewed', 'Recommended', 'Rejected', 'Approved').required(),
            recommendation: Joi.string().max(2000).allow(null, '')
        }),

        /**
         * Schema for filtering disclosures
         */
        filter: Joi.object({
            status: Joi.string().valid('Draft', 'Submitted', 'Under Review', 'Reviewed', 'Recommended', 'Rejected', 'Approved'),
            category: Joi.string(),
            dateFrom: Joi.date().iso(),
            dateTo: Joi.date().iso(),
            researcherId: Joi.string().uuid(),
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50),
            sortBy: Joi.string().valid('created_at', 'disclosure_date', 'title', 'review_status').default('created_at'),
            sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
        })
    },

    /**
     * Authentication-related validation schemas
     */
    auth: {
        /**
         * Schema for login
         */
        login: Joi.object({
            username: Joi.string().required().messages({
                'string.empty': 'Username is required'
            }),
            password: Joi.string().required().messages({
                'string.empty': 'Password is required'
            })
        }),

        /**
         * Schema for token refresh
         */
        refresh: Joi.object({
            refreshToken: Joi.string().required().messages({
                'string.empty': 'Refresh token is required'
            })
        }),

        /**
         * Schema for token validation
         */
        validate: Joi.object({
            token: Joi.string().required().messages({
                'string.empty': 'Token is required for validation'
            })
        })
    },

    /**
     * Document-related validation schemas
     */
    document: {
        /**
         * Schema for document upload
         */
        upload: Joi.object({
            documentType: Joi.string().required(),
            isConfidential: Joi.boolean().default(false),
            description: Joi.string().max(500).allow(null, '')
        }),

        /**
         * Schema for document update
         */
        update: Joi.object({
            documentType: Joi.string(),
            isConfidential: Joi.boolean(),
            description: Joi.string().max(500).allow(null, '')
        }).min(1)
    },

    /**
     * IP Asset-related validation schemas
     */
    ipAsset: {
        /**
         * Schema for creating an IP asset
         */
        create: Joi.object({
            title: Joi.string().min(5).max(500).required(),
            recordType: Joi.string().valid('Patent', 'Trademark', 'Copyright', 'PBR', 'TradeSecret').required(),
            description: Joi.string().max(2000).allow(null, ''),
            registrationNumber: Joi.string().max(100).allow(null, ''),
            filingDate: Joi.date().iso().allow(null),
            expiryDate: Joi.date().iso().allow(null),
            jurisdiction: Joi.string().max(100).allow(null, ''),
            status: Joi.string().valid('Pending', 'Filed', 'Granted', 'Rejected', 'Abandoned', 'Expired').default('Pending')
        })
    }
};

/**
 * Middleware for validating pagination parameters.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware
 */
const validatePagination = (req, res, next) => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(50),
        sortBy: Joi.string().allow(''),
        sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
    });

    const { error, value } = schema.validate(req.query, { abortEarly: false });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        throw new ValidationError('Invalid pagination parameters', errors);
    }

    req.query = { ...req.query, ...value };
    next();
};

/**
 * Middleware for validating ID parameters (UUID format).
 * 
 * @param {string} paramName - Name of the ID parameter
 * @returns {Function} Express middleware function
 */
const validateId = (paramName = 'id') => {
    return (req, res, next) => {
        const schema = Joi.object({
            [paramName]: Joi.string().uuid().required()
        });

        const { error } = schema.validate(req.params, { abortEarly: false });

        if (error) {
            throw new ValidationError(`Invalid ${paramName} format`, [
                { field: paramName, message: `${paramName} must be a valid UUID` }
            ]);
        }

        next();
    };
};

/**
 * Sanitizes string inputs to prevent XSS attacks.
 * 
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeInput = (data) => {
    if (typeof data === 'string') {
        // Remove potentially dangerous characters
        return data
            .replace(/[<>]/g, '')  // Remove < and >
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    if (Array.isArray(data)) {
        return data.map(item => sanitizeInput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }
    
    return data;
};

module.exports = {
    validate,
    schemas,
    validatePagination,
    validateId,
    sanitizeInput
};