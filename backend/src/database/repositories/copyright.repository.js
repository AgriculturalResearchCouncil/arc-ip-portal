// src/database/repositories/copyright.repository.js
/**
 * Copyright Repository
 * ====================
 * Manages database operations for copyright records.
 * Handles copyright-specific data including:
 * - Work details (title, type, description)
 * - Creator information
 * - Registration and expiry dates
 * - Copyright status and lifecycle
 * - Licenses and permissions
 * 
 * @module repositories/copyright.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * CopyrightRepository class for managing copyright records.
 * Extends BaseRepository with copyright-specific operations.
 * 
 * @class CopyrightRepository
 * @extends BaseRepository
 */
class CopyrightRepository extends BaseRepository {
    /**
     * Creates an instance of CopyrightRepository.
     * Initializes with the 'copyright_records' table and 'copyright_id' as primary key.
     */
    constructor() {
        super('copyright_records', 'copyright_id');
    }

    /**
     * Finds a complete copyright record with all related data.
     * 
     * @async
     * @param {string} id - Copyright UUID
     * @returns {Promise<Object|null>} Complete copyright object
     */
    async findFullCopyright(id) {
        if (!id) {
            throw new Error('Copyright ID is required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                cd.copyright_details_id,
                cd.work_title,
                cd.work_type,
                cd.work_description,
                cd.creation_date,
                cd.publication_date,
                cd.isbn,
                cd.issn,
                cd.keywords,
                (
                    SELECT 
                        ca.author_id,
                        ca.person_id,
                        ca.is_primary_author,
                        ca.contribution_percentage,
                        pers.first_name,
                        pers.last_name,
                        pers.email
                    FROM copyright_authors ca
                    JOIN persons pers ON ca.person_id = pers.person_id
                    WHERE ca.copyright_id = cr.copyright_id
                    FOR JSON PATH
                ) as authors,
                (
                    SELECT 
                        cl.license_id,
                        cl.license_type,
                        cl.licensee_name,
                        cl.license_date,
                        cl.expiry_date,
                        cl.terms_conditions
                    FROM copyright_licenses cl
                    WHERE cl.copyright_id = cr.copyright_id
                    FOR JSON PATH
                ) as licenses
            FROM copyright_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            WHERE cr.copyright_id = @id AND cr.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const copyright = result.recordset[0];
        
        if (copyright.authors) {
            copyright.authors = JSON.parse(copyright.authors);
        }
        if (copyright.licenses) {
            copyright.licenses = JSON.parse(copyright.licenses);
        }

        return copyright;
    }

    /**
     * Finds copyrights by owner.
     * 
     * @async
     * @param {string} personId - Owner UUID
     * @returns {Promise<Array>} Array of copyrights
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                cr.*,
                ir.reference_number,
                cd.work_title,
                cd.work_type
            FROM copyright_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            LEFT JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            WHERE ir.owner_id = @personId AND cr.is_deleted = 0
            ORDER BY cr.registration_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets copyrights by work type.
     * 
     * @async
     * @param {string} workType - Type of work (e.g., 'Book', 'Journal Article', 'Software', 'Music')
     * @returns {Promise<Array>} Array of copyrights
     */
    async findByWorkType(workType) {
        if (!workType) {
            throw new Error('Work type is required');
        }

        const query = `
            SELECT 
                cr.copyright_id,
                cr.registration_number,
                cr.registration_date,
                cd.work_title,
                cd.work_description,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name
            FROM copyright_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            WHERE cd.work_type = @workType AND cr.is_deleted = 0
            ORDER BY cr.registration_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'workType', value: workType }
        ]);

        return result.recordset;
    }

    /**
     * Gets copyright statistics.
     * 
     * @async
     * @returns {Promise<Object>} Copyright statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_copyrights,
                COUNT(CASE WHEN cr.status = 'Registered' THEN 1 END) as registered,
                COUNT(CASE WHEN cr.status = 'Pending' THEN 1 END) as pending,
                COUNT(CASE WHEN cr.status = 'Rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN cr.status = 'Expired' THEN 1 END) as expired,
                COUNT(DISTINCT cd.work_type) as work_types,
                AVG(DATEDIFF(day, cd.creation_date, cr.registration_date)) as avg_registration_days
            FROM copyright_records cr
            LEFT JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            WHERE cr.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Searches copyrights by work title or registration number.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of copyrights
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                cr.copyright_id,
                cr.registration_number,
                cr.registration_date,
                cr.status,
                cd.work_title,
                cd.work_type,
                cd.work_description,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                COUNT(DISTINCT ca.author_id) as author_count
            FROM copyright_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            LEFT JOIN copyright_authors ca ON ca.copyright_id = cr.copyright_id
            WHERE cr.is_deleted = 0
            AND (
                cd.work_title LIKE @searchTerm
                OR cr.registration_number LIKE @searchTerm
                OR cd.work_description LIKE @searchTerm
                OR cd.keywords LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            GROUP BY cr.copyright_id, cr.registration_number, cr.registration_date,
                     cr.status, cd.work_title, cd.work_type, cd.work_description,
                     ir.reference_number, p.first_name, p.last_name
            ORDER BY cr.registration_date DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }

    /**
     * Updates copyright status.
     * 
     * @async
     * @param {string} copyrightId - Copyright UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated copyright
     */
    async updateStatus(copyrightId, status, updatedBy, metadata = null) {
        if (!copyrightId || !status) {
            throw new Error('Copyright ID and status are required');
        }

        let query = `
            UPDATE copyright_records
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'copyrightId', type: sql.UniqueIdentifier, value: copyrightId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (status === 'Registered') {
            query += `, registration_date = GETDATE()`;
        }

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE copyright_id = @copyrightId`;

        await executeQuery(query, params);

        logger.info('Copyright status updated', { copyrightId, status, updatedBy });
        return this.findById(copyrightId);
    }

    /**
     * Gets copyright by registration number.
     * 
     * @async
     * @param {string} registrationNumber - Copyright registration number
     * @returns {Promise<Object|null>} Copyright object
     */
    async findByRegistrationNumber(registrationNumber) {
        if (!registrationNumber) {
            throw new Error('Registration number is required');
        }

        const query = `
            SELECT * FROM copyright_records 
            WHERE registration_number = @registrationNumber AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'registrationNumber', value: registrationNumber }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets copyrights by author.
     * 
     * @async
     * @param {string} personId - Author UUID
     * @returns {Promise<Array>} Array of copyrights
     */
    async findByAuthor(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                cr.copyright_id,
                cr.registration_number,
                cr.registration_date,
                cd.work_title,
                cd.work_type,
                ir.reference_number,
                ca.is_primary_author,
                ca.contribution_percentage
            FROM copyright_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            JOIN copyright_authors ca ON ca.copyright_id = cr.copyright_id
            WHERE ca.person_id = @personId AND cr.is_deleted = 0
            ORDER BY cr.registration_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }
}

module.exports = new CopyrightRepository();