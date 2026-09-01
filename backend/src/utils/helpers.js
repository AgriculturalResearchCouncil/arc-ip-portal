/**
 * Helpers Utility
 * ===============
 * Common utility functions used throughout the application.
 * Provides helper functions for:
 * - Date formatting
 * - String manipulation
 * - Data validation
 * - Object utilities
 * - Security helpers
 * 
 * @module utils/helpers
 */

/**
 * Formats a date to a standard string format.
 * 
 * @param {Date|string} date - Date to format
 * @param {string} [format='YYYY-MM-DD HH:mm:ss'] - Format string
 * @returns {string} Formatted date string
 * 
 * @example
 * formatDate(new Date(), 'YYYY-MM-DD') // '2024-01-01'
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
    if (!date) return null;
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    const pad = (n) => String(n).padStart(2, '0');
    
    const replacements = {
        'YYYY': d.getFullYear(),
        'MM': pad(d.getMonth() + 1),
        'DD': pad(d.getDate()),
        'HH': pad(d.getHours()),
        'mm': pad(d.getMinutes()),
        'ss': pad(d.getSeconds())
    };
    
    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(key, value);
    }
    
    return result;
};

/**
 * Truncates a string to a specified length.
 * 
 * @param {string} str - String to truncate
 * @param {number} [maxLength=100] - Maximum length
 * @param {string} [suffix='...'] - Suffix to append
 * @returns {string} Truncated string
 */
const truncate = (str, maxLength = 100, suffix = '...') => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + suffix;
};

/**
 * Sanitizes a string to prevent XSS attacks.
 * 
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Generates a random string of specified length.
 * 
 * @param {number} [length=10] - Length of the string
 * @param {string} [charset='alphanumeric'] - Charset to use ('alphanumeric', 'numeric', 'alphabetic')
 * @returns {string} Random string
 */
const generateRandomString = (length = 10, charset = 'alphanumeric') => {
    let chars = '';
    
    switch (charset) {
        case 'numeric':
            chars = '0123456789';
            break;
        case 'alphabetic':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            break;
        case 'alphanumeric':
        default:
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            break;
    }
    
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
};

/**
 * Checks if a value is a valid UUID.
 * 
 * @param {string} value - Value to check
 * @returns {boolean} True if valid UUID
 */
const isValidUuid = (value) => {
    if (!value) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
};

/**
 * Checks if a value is a valid email address.
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Checks if a value is a valid URL.
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidUrl = (url) => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Extracts file extension from filename.
 * 
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Generates a slug from a string.
 * 
 * @param {string} str - String to slugify
 * @returns {string} Slugified string
 */
const slugify = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

/**
 * Deep clones an object.
 * 
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (obj instanceof Object) {
        const cloned = {};
        for (const [key, value] of Object.entries(obj)) {
            cloned[key] = deepClone(value);
        }
        return cloned;
    }
    return obj;
};

/**
 * Picks specific properties from an object.
 * 
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to pick
 * @returns {Object} Object with picked properties
 */
const pick = (obj, keys) => {
    if (!obj || !keys || keys.length === 0) return {};
    const result = {};
    for (const key of keys) {
        if (obj.hasOwnProperty(key)) {
            result[key] = obj[key];
        }
    }
    return result;
};

/**
 * Omits specific properties from an object.
 * 
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to omit
 * @returns {Object} Object without omitted properties
 */
const omit = (obj, keys) => {
    if (!obj) return {};
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
};

/**
 * Converts a string to camel case.
 * 
 * @param {string} str - String to convert
 * @returns {string} Camel case string
 */
const toCamelCase = (str) => {
    if (!str) return '';
    return str
        .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
        .replace(/^[A-Z]/, (char) => char.toLowerCase());
};

/**
 * Converts a string to snake case.
 * 
 * @param {string} str - String to convert
 * @returns {string} Snake case string
 */
const toSnakeCase = (str) => {
    if (!str) return '';
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
};

module.exports = {
    formatDate,
    truncate,
    sanitizeString,
    generateRandomString,
    isValidUuid,
    isValidEmail,
    isValidUrl,
    getFileExtension,
    slugify,
    deepClone,
    pick,
    omit,
    toCamelCase,
    toSnakeCase
};