// src/services/patent.service.js
/**
 * Patent Service
 * ==============
 * Business logic layer for managing patents.
 * 
 * Database Schema Notes:
 * - NO 'patent_jurisdictions' table exists
 * - Patent records are in patent_records table
 * - Columns: patent_id, ip_record_id, patent_number, application_number,
 *   filing_date, grant_date, publication_date, expiry_date, jurisdiction,
 *   patent_status, created_at, updated_at
 * - NO 'is_deleted' column
 * 
 * @module services/patent.service
 * @requires ../database/repositories/patent.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const patentRepository = require('../database/repositories/patent.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');

class PatentService {
    /**
     * Gets patents with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Patent status
     * @param {string} [filters.jurisdiction] - Jurisdiction
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @param {string} [userId] - User ID for role-based filtering
     * @param {string} [userRole] - User role
     * @returns {Promise<Array>} Array of patents
     */
    async getPatents(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher' && userId) {
            return await patentRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        let query = `
            SELECT 
                pr.*,
                ir.reference_number,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND pr.patent_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.jurisdiction) {
            query += ` AND pr.jurisdiction = @jurisdiction`;
            params.push({ name: 'jurisdiction', value: filters.jurisdiction });
        }

        if (filters.dateFrom) {
            query += ` AND pr.filing_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND pr.filing_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY pr.filing_date DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets patent statistics.
     * 
     * @async
     * @returns {Promise<Object>} Patent statistics
     */
    async getStatistics() {
        return await patentRepository.getStatistics();
    }

    /**
     * Gets patent by ID with full details.
     * 
     * @async
     * @param {string} id - Patent UUID
     * @returns {Promise<Object|null>} Full patent details
     */
    async getPatentById(id) {
        return await patentRepository.findFullPatent(id);
    }

    /**
     * Searches patents by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching patents
     */
    async searchPatents(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }
        return await patentRepository.search(searchQuery);
    }
}

module.exports = new PatentService();