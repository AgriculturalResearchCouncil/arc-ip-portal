// src/services/licence.service.js
/**
 * Licence Service
 * ===============
 * Business logic layer for managing licences.
 * 
 * Database Schema Notes:
 * - NO 'is_deleted' column in licence_records
 * - Columns: licence_id, ip_record_id, licence_number, licensee_name, 
 *   territory, exclusivity, start_date, end_date, royalty_percentage, 
 *   annual_fee, status, created_at, updated_at
 * 
 * @module services/licence.service
 * @requires ../database/repositories/licence.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const licenceRepository = require('../database/repositories/licence.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');

class LicenceService {
    /**
     * Gets licences with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Licence status
     * @param {string} [filters.type] - Licence type (exclusivity)
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of licences
     */
    async getLicences(filters = {}) {
        const { executeQuery } = require('../database');

        let query = `
            SELECT 
                lr.*,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND lr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.type) {
            query += ` AND lr.exclusivity = @type`;
            params.push({ name: 'type', value: filters.type });
        }

        if (filters.dateFrom) {
            query += ` AND lr.start_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND lr.start_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY lr.created_at DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets licence statistics.
     * 
     * @async
     * @returns {Promise<Object>} Licence statistics
     */
    async getStatistics() {
        return await licenceRepository.getStatistics();
    }

    /**
     * Gets licence by ID with full details.
     * 
     * @async
     * @param {string} id - Licence UUID
     * @returns {Promise<Object|null>} Full licence details
     */
    async getLicenceById(id) {
        return await licenceRepository.findFullLicence(id);
    }

    /**
     * Gets licences expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=90] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of licences expiring soon
     */
    async getExpiringSoon(daysThreshold = 90) {
        return await licenceRepository.getExpiringSoon(daysThreshold);
    }

    /**
     * Searches licences by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching licences
     */
    async searchLicences(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }
        return await licenceRepository.search(searchQuery);
    }
}

module.exports = new LicenceService();