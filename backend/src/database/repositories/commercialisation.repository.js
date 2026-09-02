/**
 * Commercialisation Repository
 * ============================
 * Manages database operations for commercialisation_records table.
 * 
 * Database Schema (commercialisation_records):
 * - commercialisation_id (uniqueidentifier, PK)
 * - ip_record_id (uniqueidentifier, FK to ip_records)
 * - commercialisation_model (nvarchar, nullable) - 'Licensing', 'Spin-off', 'Joint Venture', 'R&D Collaboration'
 * - launch_date (date, nullable)
 * - target_market (nvarchar, nullable)
 * - revenue_projection (decimal, nullable)
 * - status (nvarchar, nullable) - 'Planning', 'Active', 'Completed', 'Cancelled'
 * - created_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Note: There is NO 'is_deleted' column in this table.
 * 
 * @module repositories/commercialisation.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * CommercialisationRepository class for managing commercialisation projects.
 * 
 * @class CommercialisationRepository
 * @extends BaseRepository
 */
class CommercialisationRepository extends BaseRepository {
    constructor() {
        super('commercialisation_records', 'commercialisation_id');
    }

    /**
     * Finds a complete commercialisation record.
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
                p.email as owner_email
            FROM commercialisation_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.commercialisation_id = @id
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Finds commercialisation projects by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of commercialisation projects
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
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE cr.ip_record_id = @ipRecordId
            ORDER BY cr.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
    }

    /**
     * Gets commercialisation statistics.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_projects,
                COUNT(CASE WHEN status = 'Planning' THEN 1 END) as planning,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN commercialisation_model = 'Licensing' THEN 1 END) as licensing,
                COUNT(CASE WHEN commercialisation_model = 'Spin-off' THEN 1 END) as spinoff,
                COUNT(CASE WHEN commercialisation_model = 'Joint Venture' THEN 1 END) as joint_venture,
                SUM(revenue_projection) as total_revenue_projection,
                AVG(revenue_projection) as avg_revenue_projection
            FROM commercialisation_records
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
            LEFT JOIN persons p ON ir.owner_id = p.person_id
            WHERE (
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
}

module.exports = new CommercialisationRepository();