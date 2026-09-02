// src/database/repositories/commercialisation.repository.js
/**
 * Commercialisation Repository
 * ============================
 * Manages database operations for commercialisation records.
 * Handles BPS Process 6: Commercialisation.
 * 
 * Database Schema:
 * - commercialisation_records (id, ip_record_id, commercialisation_model, 
 *   launch_date, target_market, revenue_projection, status, created_at, updated_at)
 * - market_assessments (market_assessment_id, disclosure_id, market_size_description,
 *   target_customers, competitors, commercialization_notes, market_opportunity_score,
 *   created_at, updated_at)
 * 
 * @module repositories/commercialisation.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * CommercialisationRepository class for managing commercialisation records.
 * 
 * @class CommercialisationRepository
 * @extends BaseRepository
 */
class CommercialisationRepository extends BaseRepository {
    constructor() {
        super('commercialisation_records', 'commercialisation_id');
    }

    /**
     * Creates a new commercialisation record.
     * 
     * @async
     * @param {Object} data - Commercialisation data
     * @param {string} data.ip_record_id - IP Record UUID (required)
     * @param {string} data.commercialisation_model - Commercialisation model (required)
     * @param {string} [data.launch_date] - Launch date
     * @param {string} [data.target_market] - Target market
     * @param {number} [data.revenue_projection] - Revenue projection
     * @param {string} [data.status] - Status
     * @returns {Promise<Object>} Created commercialisation record
     */
    async create(data) {
        if (!data.ip_record_id || !data.commercialisation_model) {
            throw new Error('IP Record ID and Commercialisation Model are required');
        }

        const id = data[this.primaryKey] || this.generateId();
        
        const query = `
            INSERT INTO ${this.fullTableName} (
                commercialisation_id,
                ip_record_id,
                commercialisation_model,
                launch_date,
                target_market,
                revenue_projection,
                status,
                created_at
            ) VALUES (
                @id,
                @ipRecordId,
                @commercialisationModel,
                @launchDate,
                @targetMarket,
                @revenueProjection,
                @status,
                GETDATE()
            )
        `;

        const params = [
            { name: 'id', type: sql.UniqueIdentifier, value: id },
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: data.ip_record_id },
            { name: 'commercialisationModel', value: data.commercialisation_model },
            { name: 'launchDate', value: data.launch_date || null },
            { name: 'targetMarket', value: data.target_market || null },
            { name: 'revenueProjection', value: data.revenue_projection || null },
            { name: 'status', value: data.status || 'Planning' }
        ];

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Updates a commercialisation record.
     * 
     * @async
     * @param {string} id - Commercialisation UUID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated commercialisation record
     */
    async update(id, data) {
        const entries = Object.entries(data).filter(([key]) => key !== this.primaryKey);
        if (entries.length === 0) {
            return this.findById(id);
        }

        // Add updated_at
        entries.push(['updated_at', new Date()]);

        const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ');
        const params = entries.map(([key, value]) => ({
            name: key,
            value: value
        }));

        params.push({ name: this.primaryKey, value: id });

        const query = `
            UPDATE ${this.fullTableName}
            SET ${setClause}
            WHERE ${this.primaryKey} = @${this.primaryKey}
        `;

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Finds a complete commercialisation record with related data.
     * 
     * @async
     * @param {string} id - Commercialisation UUID
     * @returns {Promise<Object|null>} Complete commercialisation object
     */
    async findFullCommercialisation(id) {
        if (!id) {
            throw new Error('Commercialisation ID is required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                (
                    SELECT 
                        ma.market_assessment_id,
                        ma.disclosure_id,
                        ma.market_size_description,
                        ma.target_customers,
                        ma.competitors,
                        ma.commercialization_notes,
                        ma.market_opportunity_score,
                        ma.created_at,
                        d.title as disclosure_title
                    FROM market_assessments ma
                    LEFT JOIN disclosures d ON ma.disclosure_id = d.disclosure_id
                    WHERE ma.disclosure_id = d.disclosure_id
                    AND ma.is_deleted = 0
                    FOR JSON PATH
                ) as market_assessments
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.commercialisation_id = @id AND cr.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const commercialisation = result.recordset[0];
        
        if (commercialisation.market_assessments) {
            commercialisation.market_assessments = JSON.parse(commercialisation.market_assessments);
        }

        return commercialisation;
    }

    /**
     * Finds commercialisation records by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of commercialisation records
     */
    async findByIpRecord(ipRecordId) {
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.ip_record_id = @ipRecordId AND cr.is_deleted = 0
            ORDER BY cr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
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
     * @returns {Promise<Object>} Created market assessment
     */
    async conductMarketAssessment(disclosureId, assessmentData) {
        if (!disclosureId) {
            throw new Error('Disclosure ID is required');
        }

        const assessmentId = this.generateId();
        const query = `
            INSERT INTO market_assessments (
                market_assessment_id,
                disclosure_id,
                market_size_description,
                target_customers,
                competitors,
                commercialization_notes,
                market_opportunity_score,
                created_at
            ) VALUES (
                @assessmentId,
                @disclosureId,
                @marketSizeDescription,
                @targetCustomers,
                @competitors,
                @commercializationNotes,
                @marketOpportunityScore,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'assessmentId', type: sql.UniqueIdentifier, value: assessmentId },
            { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId },
            { name: 'marketSizeDescription', value: assessmentData.marketSizeDescription || null },
            { name: 'targetCustomers', value: assessmentData.targetCustomers || null },
            { name: 'competitors', value: assessmentData.competitors || null },
            { name: 'commercializationNotes', value: assessmentData.commercializationNotes || null },
            { name: 'marketOpportunityScore', value: assessmentData.marketOpportunityScore || null }
        ]);

        logger.info('Market assessment conducted', { disclosureId, assessmentId });
        return this.getMarketAssessmentById(assessmentId);
    }

    /**
     * Gets a market assessment by ID.
     * 
     * @async
     * @param {string} assessmentId - Market assessment UUID
     * @returns {Promise<Object|null>} Market assessment object
     */
    async getMarketAssessmentById(assessmentId) {
        if (!assessmentId) {
            throw new Error('Market assessment ID is required');
        }

        const query = `
            SELECT 
                ma.*,
                d.title as disclosure_title,
                d.disclosure_category
            FROM market_assessments ma
            LEFT JOIN disclosures d ON ma.disclosure_id = d.disclosure_id
            WHERE ma.market_assessment_id = @assessmentId AND ma.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'assessmentId', type: sql.UniqueIdentifier, value: assessmentId }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets market assessments by disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @returns {Promise<Array>} Array of market assessments
     */
    async getMarketAssessmentsByDisclosure(disclosureId) {
        if (!disclosureId) {
            throw new Error('Disclosure ID is required');
        }

        const query = `
            SELECT 
                ma.*,
                d.title as disclosure_title
            FROM market_assessments ma
            LEFT JOIN disclosures d ON ma.disclosure_id = d.disclosure_id
            WHERE ma.disclosure_id = @disclosureId AND ma.is_deleted = 0
            ORDER BY ma.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId }
        ]);

        return result.recordset;
    }

    /**
     * Gets commercialisation statistics.
     * 
     * @async
     * @returns {Promise<Object>} Commercialisation statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN status = 'Planning' THEN 1 END) as planning,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN status = 'On Hold' THEN 1 END) as on_hold,
                COUNT(CASE WHEN commercialisation_model = 'Licensing' THEN 1 END) as licensing,
                COUNT(CASE WHEN commercialisation_model = 'Spin-off' THEN 1 END) as spinoff,
                COUNT(CASE WHEN commercialisation_model = 'Joint Venture' THEN 1 END) as joint_venture,
                COUNT(CASE WHEN commercialisation_model = 'R&D Collaboration' THEN 1 END) as rd_collaboration,
                SUM(revenue_projection) as total_revenue_projection,
                AVG(revenue_projection) as avg_revenue_projection
            FROM commercialisation_records
            WHERE is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
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
        if (!commercialisationId || !status) {
            throw new Error('Commercialisation ID and status are required');
        }

        const query = `
            UPDATE commercialisation_records
            SET status = @status,
                updated_at = GETDATE()
            WHERE commercialisation_id = @commercialisationId
        `;

        await executeQuery(query, [
            { name: 'commercialisationId', type: sql.UniqueIdentifier, value: commercialisationId },
            { name: 'status', value: status }
        ]);

        logger.info('Commercialisation status updated', { commercialisationId, status, updatedBy });
        return this.findById(commercialisationId);
    }

    /**
     * Searches commercialisation projects.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of matching projects
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                cr.commercialisation_id,
                cr.commercialisation_model,
                cr.launch_date,
                cr.target_market,
                cr.revenue_projection,
                cr.status,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.is_deleted = 0
            AND (
                cr.commercialisation_model LIKE @searchTerm
                OR cr.target_market LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR ir.title LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY cr.created_at DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Gets commercialisation projects by status.
     * 
     * @async
     * @param {string} status - Project status
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async findByStatus(status) {
        if (!status) {
            throw new Error('Status is required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.status = @status AND cr.is_deleted = 0
            ORDER BY cr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'status', value: status }
        ]);

        return result.recordset;
    }

    /**
     * Gets commercialisation projects by model.
     * 
     * @async
     * @param {string} model - Commercialisation model
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async findByModel(model) {
        if (!model) {
            throw new Error('Commercialisation model is required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.commercialisation_model = @model AND cr.is_deleted = 0
            ORDER BY cr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'model', value: model }
        ]);

        return result.recordset;
    }

    /**
     * Gets commercialisation projects by revenue projection range.
     * 
     * @async
     * @param {number} min - Minimum revenue
     * @param {number} max - Maximum revenue
     * @returns {Promise<Array>} Array of commercialisation projects
     */
    async findByRevenueRange(min, max) {
        if (min === undefined || max === undefined) {
            throw new Error('Min and max revenue values are required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as owner_name
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.revenue_projection BETWEEN @min AND @max
            AND cr.is_deleted = 0
            ORDER BY cr.revenue_projection DESC
        `;

        const result = await executeQuery(query, [
            { name: 'min', value: min },
            { name: 'max', value: max }
        ]);

        return result.recordset;
    }
}

module.exports = new CommercialisationRepository();