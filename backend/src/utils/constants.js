/**
 * Application Constants
 * =====================
 * Centralized constants used throughout the application.
 * Includes role definitions, status values, error codes, and configuration.
 * 
 * @module utils/constants
 */

/**
 * User Roles
 * Defines all possible roles in the system.
 * Each role has specific permissions for different operations.
 */
const ROLES = {
    /** Researcher - creates disclosures, views own IP records */
    RESEARCHER: 'Researcher',
    
    /** TTO Officer - reviews disclosures, manages IP assets */
    TTO_OFFICER: 'TTO Officer',
    
    /** Legal Officer - handles legal aspects, patents, trademarks */
    LEGAL_OFFICER: 'Legal Officer',
    
    /** Finance Officer - manages financial aspects of IP */
    FINANCE_OFFICER: 'Finance Officer',
    
    /** Executive - high-level oversight, reporting */
    EXECUTIVE: 'Executive',
    
    /** System Administrator - full system access */
    ADMIN: 'Admin',
    
    /** ICT - system maintenance and support */
    ICT: 'ICT'
};

/**
 * Disclosure Review Status
 * States in the disclosure lifecycle.
 */
const DISCLOSURE_STATUS = {
    /** Initial draft state, not yet submitted */
    DRAFT: 'Draft',
    
    /** Submitted by researcher, awaiting TTO review */
    SUBMITTED: 'Submitted',
    
    /** Currently being reviewed by TTO staff */
    UNDER_REVIEW: 'Under Review',
    
    /** Reviewed but no decision made yet */
    REVIEWED: 'Reviewed',
    
    /** Recommended for protection filing */
    RECOMMENDED: 'Recommended',
    
    /** Not recommended for protection */
    REJECTED: 'Rejected',
    
    /** Approved for protection filing */
    APPROVED: 'Approved',
    
    /** Archived (inactive) */
    ARCHIVED: 'Archived'
};

/**
 * IP Record Types
 * Types of intellectual property records.
 */
const IP_RECORD_TYPES = {
    /** Invention disclosure */
    DISCLOSURE: 'Disclosure',
    
    /** Patent application */
    PATENT: 'Patent',
    
    /** Plant Breeders' Rights */
    PBR: 'PBR',
    
    /** Trademark registration */
    TRADEMARK: 'Trademark',
    
    /** Copyright registration */
    COPYRIGHT: 'Copyright',
    
    /** Trade secret */
    TRADE_SECRET: 'TradeSecret'
};

/**
 * IP Status Values
 * Status of IP records throughout their lifecycle.
 */
const IP_STATUS = {
    /** Initial draft state */
    DRAFT: 'Draft',
    
    /** Submitted for review/processing */
    SUBMITTED: 'Submitted',
    
    /** Under review by relevant authority */
    UNDER_REVIEW: 'Under Review',
    
    /** Filed with relevant authority */
    FILED: 'Filed',
    
    /** Granted/approved */
    GRANTED: 'Granted',
    
    /** Rejected */
    REJECTED: 'Rejected',
    
    /** Abandoned */
    ABANDONED: 'Abandoned',
    
    /** Expired */
    EXPIRED: 'Expired'
};

/**
 * Event Types for Audit Logging
 * All possible audit events in the system.
 */
const AUDIT_EVENTS = {
    // Authentication events
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
    
    // User management events
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DEACTIVATED: 'USER_DEACTIVATED',
    USER_REACTIVATED: 'USER_REACTIVATED',
    ROLE_ASSIGNED: 'ROLE_ASSIGNED',
    ROLE_REMOVED: 'ROLE_REMOVED',
    
    // Disclosure events
    DISCLOSURE_CREATED: 'DISCLOSURE_CREATED',
    DISCLOSURE_UPDATED: 'DISCLOSURE_UPDATED',
    DISCLOSURE_SUBMITTED: 'DISCLOSURE_SUBMITTED',
    DISCLOSURE_REVIEWED: 'DISCLOSURE_REVIEWED',
    DISCLOSURE_APPROVED: 'DISCLOSURE_APPROVED',
    DISCLOSURE_REJECTED: 'DISCLOSURE_REJECTED',
    
    // IP Record events
    IP_RECORD_CREATED: 'IP_RECORD_CREATED',
    IP_RECORD_UPDATED: 'IP_RECORD_UPDATED',
    IP_RECORD_STATUS_CHANGED: 'IP_RECORD_STATUS_CHANGED',
    
    // Document events
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
    DOCUMENT_DELETED: 'DOCUMENT_DELETED',
    DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED',
    
    // Workflow events
    WORKFLOW_STARTED: 'WORKFLOW_STARTED',
    WORKFLOW_COMPLETED: 'WORKFLOW_COMPLETED',
    WORKFLOW_ACTION: 'WORKFLOW_ACTION',
    
    // System events
    SYSTEM_ERROR: 'SYSTEM_ERROR',
    SYSTEM_WARNING: 'SYSTEM_WARNING',
    SYSTEM_INFO: 'SYSTEM_INFO'
};

/**
 * Document Types
 * Types of documents that can be uploaded.
 */
const DOCUMENT_TYPES = {
    /** Invention disclosure form */
    DISCLOSURE_FORM: 'Disclosure Form',
    
    /** Patent application */
    PATENT_APPLICATION: 'Patent Application',
    
    /** Research paper */
    RESEARCH_PAPER: 'Research Paper',
    
    /** Lab notebook */
    LAB_NOTEBOOK: 'Lab Notebook',
    
    /** Supporting evidence */
    SUPPORTING_EVIDENCE: 'Supporting Evidence',
    
    /** Legal document */
    LEGAL_DOCUMENT: 'Legal Document',
    
    /** License agreement */
    LICENSE_AGREEMENT: 'License Agreement',
    
    /** Other document */
    OTHER: 'Other'
};

/**
 * Error Codes
 * Standardized error codes for API responses.
 */
const ERROR_CODES = {
    // Authentication errors (400-499)
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    
    // Validation errors (400-499)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    
    // Resource errors (400-499)
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    DUPLICATE: 'DUPLICATE',
    
    // Server errors (500-599)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

/**
 * HTTP Status Codes
 * Standard HTTP status codes with descriptions.
 */
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

/**
 * Configuration Constants
 * Application-wide configuration values.
 */
const CONFIG = {
    /** Maximum file upload size (10MB) */
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    
    /** Allowed file extensions for upload */
    ALLOWED_FILE_EXTENSIONS: [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.jpg', '.jpeg', '.png', '.txt', '.rtf'
    ],
    
    /** Date format for display */
    DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    
    /** Timezone */
    TIMEZONE: 'Africa/Johannesburg',
    
    /** Pagination defaults */
    PAGINATION: {
        DEFAULT_PAGE: 1,
        DEFAULT_LIMIT: 50,
        MAX_LIMIT: 100
    },
    
    /** Session timeout (8 hours in milliseconds) */
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000,
    
    /** Refresh token expiry (7 days) */
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000
};

/**
 * Database Table Names
 * Constants for table names to avoid typos.
 */
const TABLES = {
    PERSONS: 'persons',
    ROLES: 'roles',
    PERSON_ROLES: 'person_roles',
    INSTITUTES: 'institutes',
    IP_RECORDS: 'ip_records',
    IP_RECORD_PERSONS: 'ip_record_persons',
    DISCLOSURES: 'disclosures',
    DISCLOSURE_FORM_METADATA: 'disclosure_form_metadata',
    PATENT_RECORDS: 'patent_records',
    PBR_RECORDS: 'pbr_records',
    TRADEMARK_RECORDS: 'trademark_records',
    COPYRIGHT_RECORDS: 'copyright_records',
    TRADE_SECRET_RECORDS: 'trade_secret_records',
    LICENCE_RECORDS: 'licence_records',
    DOCUMENTS: 'documents',
    IP_LIFECYCLE_EVENTS: 'ip_lifecycle_events',
    IP_RELATIONSHIPS: 'ip_relationships',
    OBLIGATIONS: 'obligations',
    COMMERCIALISATION_RECORDS: 'commercialisation_records',
    MTA_RECORDS: 'mta_records',
    NDA_RECORDS: 'nda_records',
    NOTIFICATIONS: 'notifications',
    AUDIT_LOGS: 'audit_logs'
};

/**
 * Cache Keys
 * Redis cache key patterns.
 */
const CACHE_KEYS = {
    USER: (id) => `user:${id}`,
    USER_ROLES: (id) => `user:${id}:roles`,
    DISCLOSURE: (id) => `disclosure:${id}`,
    IP_RECORD: (id) => `ip:${id}`,
    STATISTICS: 'statistics:disclosures',
    PENDING_REVIEWS: 'disclosures:pending',
    CATEGORIES: 'disclosures:categories'
};

/**
 * Default Values
 * Default values for various entities.
 */
const DEFAULTS = {
    /** Default confidentiality level */
    CONFIDENTIALITY: 'Confidential',
    
    /** Default role for new users */
    USER_ROLE: ROLES.RESEARCHER,
    
    /** Default disclosure status */
    DISCLOSURE_STATUS: DISCLOSURE_STATUS.DRAFT,
    
    /** Default IP status */
    IP_STATUS: IP_STATUS.DRAFT,
    
    /** Default record type */
    RECORD_TYPE: IP_RECORD_TYPES.DISCLOSURE
};

module.exports = {
    ROLES,
    DISCLOSURE_STATUS,
    IP_RECORD_TYPES,
    IP_STATUS,
    AUDIT_EVENTS,
    DOCUMENT_TYPES,
    ERROR_CODES,
    HTTP_STATUS,
    CONFIG,
    TABLES,
    CACHE_KEYS,
    DEFAULTS
};