// src/services/ip-asset.service.js
/**
 * IP Asset Service
 * ================
 * Business logic layer for managing intellectual property assets.
 * 
 * Database Schema Notes:
 * - NO 'is_deleted' column in ip_records
 * - Columns: ip_record_id, reference_number, record_type, title, description,
 *   institute_id, owner_id, status, confidentiality_level, created_by,
 *   created_at, updated_at
 * 
 * @module services/ip-asset.service
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const ipRecordRepository = require('../database/repositories/ip-record.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');

class IpAssetService {
    /**
     * Gets IP assets with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.type] - Filter by record type
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.dateFrom] - Filter from date
     * @param {string} [filters.dateTo] - Filter to date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @param {string} [userId] - User ID for role-based filtering
     * @param {string} [userRole] - User role
     * @returns {Promise<Array>} Array of IP assets
     */
    async getIpAssets(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher' && userId) {
            return await ipRecordRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        
        let query = `
            SELECT 
                ir.*,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                i.institute_name as institute_name
            FROM ip_records ir
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN institutes i ON ir.institute_id = i.institute_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.type) {
            query += ` AND ir.record_type = @type`;
            params.push({ name: 'type', value: filters.type });
        }

        if (filters.status) {
            query += ` AND ir.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.dateFrom) {
            query += ` AND ir.created_at >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND ir.created_at <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY ir.created_at DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets IP asset statistics.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        return await ipRecordRepository.getStatistics();
    }

    /**
     * Gets IP asset by ID with full details.
     * 
     * @async
     * @param {string} id - IP record UUID
     * @returns {Promise<Object|null>} Full IP asset details
     */
    async getIpAssetById(id) {
        return await ipRecordRepository.findFullRecord(id);
    }

    /**
     * Gets all IP assets for a researcher.
     * 
     * @async
     * @param {string} personId - Researcher UUID
     * @returns {Promise<Array>} Array of IP assets
     */
    async getResearcherAssets(personId) {
        return await ipRecordRepository.findByOwner(personId);
    }

    /**
     * Searches IP assets.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching IP assets
     */
    async search(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }
        return await ipRecordRepository.search(searchQuery);
    }

    /**
     * Gets pending IP assets for review.
     * 
     * @async
     * @param {string} [recordType] - Optional record type filter
     * @returns {Promise<Array>} Array of pending assets
     */
    async getPendingAssets(recordType = null) {
        return await ipRecordRepository.getPendingRecords(recordType);
    }
}

module.exports = new IpAssetService();