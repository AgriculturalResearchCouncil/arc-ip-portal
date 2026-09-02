// src/services/commercialisation.service.js
/**
 * Commercialisation Service
 * =========================
 * Business logic layer for commercialisation management.
 * Handles BPS Process 6: Commercialisation.
 * 
 * Process 6 Steps:
 * 1. Conduct market assessment
 * 2. Identify target industries
 * 3. Identify partners
 * 4. Evaluate commercial opportunities
 * 5. Develop commercialisation plan
 * 6. Promote technology
 * 7. Record opportunities
 * 
 * @module services/commercialisation.service
 * @requires ../database/repositories/commercialisation.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../database/repositories/disclosure.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 */

const commercialisationRepository = require('../database/repositories/commercialisation.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const disclosureRepository = require('../database/repositories/disclosure.repository');
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
     * Corresponds to BPS Process 6 Step 5: Develop commercialisation plan.
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
     * Conducts a market assessment.
     * Corresponds to BPS Process 6 Step 1: Conduct market assessment.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {Object} assessmentData - Assessment data
     * @param {string} [assessmentData.marketSizeDescription] - Market size description
     * @param {string} [assessmentData.targetCustomers] - Target customers
     * @param {string} [assessmentData.competitors] - Competitors
     * @param {string} [assessmentData.commercializationNotes] - Commercialization notes
     * @param {number} [assessmentData.marketOpportunityScore] - Market opportunity score (1-10)
     * @param {string} createdBy - User UUID
     * @returns {Promise<Object>} Created market assessment
     */
    async conductMarketAssessment(disclosureId, assessmentData, createdBy) {
        // Verify disclosure exists
        const disclosure = await disclosureRepository.findById(disclosureId);
        if (!disclosure) {
            throw new NotFoundError('Disclosure not found', { disclosureId });
        }

        const assessment = await commercialisationRepository.conductMarketAssessment(
            disclosureId,
            assessmentData
        );

        logger.logAudit('MARKET_ASSESSMENT_CONDUCTED', createdBy, {
            disclosureId,
            assessmentId: assessment.market_assessment_id,
            score: assessmentData.marketOpportunityScore
        });

        return assessment;
    }

    /**
     * Gets market assessments by disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @returns {Promise<Array>} Array of market assessments
     */
    async getMarketAssessmentsByDisclosure(disclosureId) {
        return await commercialisationRepository.getMarketAssessmentsByDisclosure(disclosureId);
    }

    /**
     * Gets a market assessment by ID.
     * 
     * @async
     * @param {string} assessmentId - Market assessment UUID
     * @returns {Promise<Object|null>} Market assessment object
     */
    async getMarketAssessmentById(assessmentId) {
        return await commercialisationRepository.getMarketAssessmentById(assessmentId);
    }

    /**
     * Gets commercialisation by ID.
     * 
     * @async
     * @param {string} id - Commercialisation UUID
     * @returns {Promise<Object|null>} Commercialisation object
     */
    async getCommercialisationById(id) {
        return await commercialisationRepository.findFullCommercialisation(id);
    }

    /**
     * Gets all commercialisation projects with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Project status
     * @param {string} [filters.model] - Commercialisation model
     * @param {number} [filters.minRevenue] - Minimum revenue
     * @param {number} [filters.maxRevenue] - Maximum revenue
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async getCommercialisations(filters = {}) {
        if (filters.status) {
            return await commercialisationRepository.findByStatus(filters.status);
        }

        if (filters.model) {
            return await commercialisationRepository.findByModel(filters.model);
        }

        if (filters.minRevenue !== undefined && filters.maxRevenue !== undefined) {
            return await commercialisationRepository.findByRevenueRange(
                filters.minRevenue,
                filters.maxRevenue
            );
        }

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
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.is_deleted = 0
            ORDER BY cr.created_at DESC
        `;

        const params = [];

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
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
     * Updates a commercialisation project.
     * 
     * @async
     * @param {string} commercialisationId - Commercialisation UUID
     * @param {Object} data - Update data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated commercialisation
     */
    async updateCommercialisation(commercialisationId, data, updatedBy) {
        const commercialisation = await commercialisationRepository.findById(commercialisationId);
        if (!commercialisation) {
            throw new NotFoundError('Commercialisation project not found', { commercialisationId });
        }

        const updated = await commercialisationRepository.update(commercialisationId, data);

        logger.logAudit('COMMERCIALISATION_UPDATED', updatedBy, {
            commercialisationId,
            updatedFields: Object.keys(data)
        });

        return updated;
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
     * Searches commercialisation projects.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching projects
     */
    async searchCommercialisations(searchQuery) {
        return await commercialisationRepository.search(searchQuery);
    }

    /**
     * Gets commercialisation projects by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async getByIpRecord(ipRecordId) {
        return await commercialisationRepository.findByIpRecord(ipRecordId);
    }

    /**
     * Gets commercialisation projects by model.
     * 
     * @async
     * @param {string} model - Commercialisation model
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async getByModel(model) {
        return await commercialisationRepository.findByModel(model);
    }
}

module.exports = new CommercialisationService();