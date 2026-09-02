// src/services/commercialisation.service.js
/**
 * Commercialisation Service
 * =========================
 * Business logic layer for commercialisation management.
 * Handles BPS Process 6: Commercialisation.
 * 
 * Database Schema Notes:
 * - NO 'is_deleted' column in commercialisation_records
 * - Columns: commercialisation_id, ip_record_id, commercialisation_model, 
 *   launch_date, target_market, revenue_projection, status, created_at, updated_at
 * 
 * @module services/commercialisation.service
 * @requires ../database/repositories/commercialisation.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const commercialisationRepository = require('../database/repositories/commercialisation.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');

/**
 * CommercialisationService class containing all commercialisation business logic.
 * 
 * @class CommercialisationService
 */
class CommercialisationService {
    /**
     * Creates a new commercialisation project.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {Object} data - Commercialisation data
     * @param {string} data.commercialisation_model - Commercialisation model (required)
     * @param {string} [data.launch_date] - Launch date
     * @param {string} [data.target_market] - Target market
     * @param {number} [data.revenue_projection] - Revenue projection
     * @param {string} [data.status] - Status
     * @param {string} createdBy - User UUID
     * @returns {Promise<Object>} Created commercialisation project
     */
    async createCommercialisation(ipRecordId, data, createdBy) {
        try {
            // Validate required fields
            if (!data.commercialisation_model) {
                throw new ValidationError('Commercialisation model is required', {
                    required: ['commercialisation_model'],
                    provided: Object.keys(data)
                });
            }

            // Verify IP record exists
            const ipRecord = await ipRecordRepository.findById(ipRecordId);
            if (!ipRecord) {
                throw new NotFoundError('IP record not found', { ipRecordId });
            }

            // Check if IP record is ready for commercialisation
            const readyStatuses = ['Approved', 'Granted', 'Registered', 'Active'];
            if (!readyStatuses.includes(ipRecord.status)) {
                throw new ForbiddenError(
                    'IP record must be in Approved, Granted, or Registered status for commercialisation',
                    {
                        ipRecordId,
                        currentStatus: ipRecord.status,
                        requiredStatuses: readyStatuses
                    }
                );
            }

            // Create commercialisation record
            const commercialisationData = {
                ip_record_id: ipRecordId,
                commercialisation_model: data.commercialisation_model,
                launch_date: data.launch_date || null,
                target_market: data.target_market || null,
                revenue_projection: data.revenue_projection || null,
                status: data.status || 'Planning'
            };

            const commercialisation = await commercialisationRepository.create(commercialisationData);
            
            logger.info('Commercialisation project created', {
                commercialisationId: commercialisation.commercialisation_id,
                ipRecordId,
                model: data.commercialisation_model,
                createdBy
            });

            // Update IP record status
            await ipRecordRepository.updateStatus(
                ipRecordId,
                'Commercialisation Active',
                createdBy
            );

            logger.logAudit('COMMERCIALISATION_CREATED', createdBy, {
                commercialisationId: commercialisation.commercialisation_id,
                ipRecordId,
                model: data.commercialisation_model
            });

            return commercialisation;
        } catch (error) {
            logger.error('Error creating commercialisation:', error);
            throw error;
        }
    }

    /**
     * Gets all commercialisation projects with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Project status
     * @param {string} [filters.model] - Commercialisation model
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async getCommercialisations(filters = {}) {
        const { executeQuery } = require('../database');

        let query = `
            SELECT 
                cr.*,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ` AND cr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.model) {
            query += ` AND cr.commercialisation_model = @model`;
            params.push({ name: 'model', value: filters.model });
        }

        if (filters.dateFrom) {
            query += ` AND cr.launch_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND cr.launch_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` ORDER BY cr.created_at DESC`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets commercialisation statistics.
     * 
     * @async
     * @returns {Promise<Object>} Commercialisation statistics
     */
    async getStatistics() {
        return await commercialisationRepository.getStatistics();
    }

    /**
     * Gets commercialisation by ID with full details.
     * 
     * @async
     * @param {string} id - Commercialisation UUID
     * @returns {Promise<Object|null>} Full commercialisation details
     */
    async getCommercialisationById(id) {
        return await commercialisationRepository.findFullCommercialisation(id);
    }

    /**
     * Updates commercialisation status.
     * 
     * @async
     * @param {string} commercialisationId - Commercialisation UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated commercialisation
     */
    async updateStatus(commercialisationId, status, updatedBy) {
        const commercialisation = await commercialisationRepository.findById(commercialisationId);
        if (!commercialisation) {
            throw new NotFoundError('Commercialisation project not found', { commercialisationId });
        }

        const validStatuses = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid status', {
                status,
                validStatuses
            });
        }

        const updated = await commercialisationRepository.updateStatus(
            commercialisationId,
            status,
            updatedBy
        );

        logger.logAudit('COMMERCIALISATION_STATUS_UPDATED', updatedBy, {
            commercialisationId,
            oldStatus: commercialisation.status,
            newStatus: status
        });

        return updated;
    }

    /**
     * Searches commercialisation projects.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching projects
     */
    async searchCommercialisations(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }
        return await commercialisationRepository.search(searchQuery);
    }
}

module.exports = new CommercialisationService();