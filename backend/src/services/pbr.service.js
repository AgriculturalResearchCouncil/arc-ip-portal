// src/services/pbr.service.js
/**
 * PBR Service
 * ===========
 * Business logic layer for managing Plant Breeders' Rights.
 * Handles PBR lifecycle including:
 * - PBR creation from disclosures
 * - Variety management
 * - Jurisdiction management
 * - Renewal tracking
 * - Status transitions
 * - PBR searches
 * 
 * @module services/pbr.service
 * @requires ../database/repositories/pbr.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const pbrRepository = require('../database/repositories/pbr.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * PbrService class containing all PBR business logic.
 * 
 * @class PbrService
 */
class PbrService {
    /**
     * Creates a new PBR from a disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {Object} data - PBR data
     * @param {string} data.applicationNumber - PBR application number
     * @param {string} data.applicationDate - Application date
     * @param {string} data.varietyName - Plant variety name
     * @param {string} data.species - Species of the plant
     * @param {string} data.genus - Genus of the plant
     * @param {Array} data.jurisdictions - Jurisdictions to file in
     * @param {Array} data.breeders - Breeder details
     * @param {string} data.characteristics - Variety characteristics
     * @param {string} data.breedingHistory - Breeding history
     * @returns {Promise<Object>} Created PBR
     * @throws {ValidationError} If required fields are missing
     * @throws {NotFoundError} If disclosure not found
     */
    async createPbrFromDisclosure(disclosureId, data) {
        try {
            // Validate required fields
            if (!data.applicationNumber || !data.applicationDate || !data.varietyName || !data.species) {
                throw new ValidationError('Missing required fields', {
                    required: ['applicationNumber', 'applicationDate', 'varietyName', 'species'],
                    provided: Object.keys(data)
                });
            }

            // Get the disclosure
            const disclosure = await disclosureRepository.findById(disclosureId);
            if (!disclosure) {
                throw new NotFoundError('Disclosure not found', { disclosureId });
            }

            // Get the IP record
            const ipRecord = await ipRecordRepository.findById(disclosure.ip_record_id);
            if (!ipRecord) {
                throw new NotFoundError('IP record not found', { ipRecordId: disclosure.ip_record_id });
            }

            // Create variety
            const varietyId = uuidv4();
            await this.createVariety(varietyId, data);

            // Create PBR record
            const pbrId = uuidv4();
            const pbrData = {
                pbr_id: pbrId,
                ip_record_id: ipRecord.ip_record_id,
                application_number: data.applicationNumber,
                application_date: data.applicationDate,
                variety_id: varietyId,
                status: 'Applied',
                created_by: ipRecord.owner_id,
            };

            const pbr = await pbrRepository.create(pbrData);

            // Add jurisdictions
            if (data.jurisdictions && data.jurisdictions.length > 0) {
                await this.addJurisdictions(pbrId, data.jurisdictions);
            }

            // Add breeders if provided
            if (data.breeders && data.breeders.length > 0) {
                await this.addBreeders(ipRecord.ip_record_id, data.breeders);
            }

            // Update IP record status
            await ipRecordRepository.updateStatus(
                ipRecord.ip_record_id,
                'PBR Applied',
                ipRecord.owner_id
            );

            logger.info('PBR created from disclosure', {
                pbrId,
                disclosureId,
                applicationNumber: data.applicationNumber,
                varietyName: data.varietyName
            });

            return pbr;
        } catch (error) {
            logger.error('Error creating PBR:', error);
            throw error;
        }
    }

    /**
     * Creates a variety record.
     * 
     * @async
     * @param {string} varietyId - Variety UUID
     * @param {Object} data - Variety data
     * @returns {Promise<boolean>} True if successful
     */
    async createVariety(varietyId, data) {
        const { executeQuery, sql } = require('../database');

        const query = `
            INSERT INTO varieties (
                variety_id,
                variety_name,
                species,
                genus,
                common_name,
                characteristics,
                breeding_history,
                created_at
            ) VALUES (
                @varietyId,
                @varietyName,
                @species,
                @genus,
                @commonName,
                @characteristics,
                @breedingHistory,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'varietyId', type: sql.UniqueIdentifier, value: varietyId },
            { name: 'varietyName', value: data.varietyName },
            { name: 'species', value: data.species },
            { name: 'genus', value: data.genus || null },
            { name: 'commonName', value: data.commonName || null },
            { name: 'characteristics', value: data.characteristics || null },
            { name: 'breedingHistory', value: data.breedingHistory || null },
        ]);

        return true;
    }

    /**
     * Adds jurisdictions to a PBR.
     * 
     * @async
     * @param {string} pbrId - PBR UUID
     * @param {Array} jurisdictions - Jurisdiction codes
     * @returns {Promise<boolean>} True if successful
     */
    async addJurisdictions(pbrId, jurisdictions) {
        const { executeQuery, sql } = require('../database');

        for (const jurisdiction of jurisdictions) {
            const query = `
                INSERT INTO pbr_jurisdictions (
                    jurisdiction_id,
                    pbr_id,
                    jurisdiction_code,
                    jurisdiction_name,
                    application_date,
                    status,
                    created_at
                ) VALUES (
                    @id,
                    @pbrId,
                    @jurisdictionCode,
                    @jurisdictionName,
                    @applicationDate,
                    'Pending',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'pbrId', type: sql.UniqueIdentifier, value: pbrId },
                { name: 'jurisdictionCode', value: jurisdiction.code },
                { name: 'jurisdictionName', value: jurisdiction.name || jurisdiction.code },
                { name: 'applicationDate', value: jurisdiction.applicationDate || new Date() },
            ]);
        }

        return true;
    }

    /**
     * Adds breeders to a PBR.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {Array} breeders - Array of breeder objects
     * @returns {Promise<boolean>} True if successful
     */
    async addBreeders(ipRecordId, breeders) {
        const { executeQuery, sql } = require('../database');

        for (const breeder of breeders) {
            let personId = breeder.personId;
            
            if (!personId && breeder.email) {
                const existingPerson = await personRepository.findByEmail(breeder.email);
                if (existingPerson) {
                    personId = existingPerson.person_id;
                }
            }

            if (!personId) {
                const newPerson = await personRepository.create({
                    first_name: breeder.firstName,
                    last_name: breeder.lastName,
                    email: breeder.email || `breeder-${Date.now()}@example.com`,
                    employee_number: breeder.employeeNumber || null,
                    position_title: breeder.positionTitle || 'Breeder',
                    active: 1,
                });
                personId = newPerson.person_id;
            }

            const query = `
                INSERT INTO ip_record_persons (
                    ip_record_person_id,
                    ip_record_id,
                    person_id,
                    role_type,
                    contribution_percentage,
                    created_at
                ) VALUES (
                    @id,
                    @ipRecordId,
                    @personId,
                    'Breeder',
                    @contributionPercentage,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
                { name: 'personId', type: sql.UniqueIdentifier, value: personId },
                { name: 'contributionPercentage', value: breeder.contributionPercentage || null },
            ]);
        }

        return true;
    }

    /**
     * Gets PBR by ID with full details.
     * 
     * @async
     * @param {string} id - PBR UUID
     * @returns {Promise<Object|null>} Full PBR details
     */
    async getPbrById(id) {
        return await pbrRepository.findFullPbr(id);
    }

    /**
     * Gets all PBRs with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - PBR status
     * @param {string} [filters.species] - Species filter
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @param {string} [userId] - User ID for role-based filtering
     * @param {string} [userRole] - User role
     * @returns {Promise<Array>} Array of PBRs
     */
    async getPbrs(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher') {
            return await pbrRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        let query = `
            SELECT 
                pbr.*,
                ir.reference_number,
                v.variety_name,
                v.species,
                v.genus,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT pj.jurisdiction_id) as jurisdiction_count
            FROM pbr_records pbr
            JOIN ip_records ir ON pbr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN varieties v ON pbr.variety_id = v.variety_id
            LEFT JOIN pbr_jurisdictions pj ON pj.pbr_id = pbr.pbr_id
            WHERE pbr.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND pbr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.species) {
            query += ` AND v.species = @species`;
            params.push({ name: 'species', value: filters.species });
        }

        if (filters.dateFrom) {
            query += ` AND pbr.application_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND pbr.application_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` GROUP BY pbr.pbr_id, pbr.ip_record_id, pbr.application_number, pbr.status, 
                  pbr.application_date, pbr.grant_date, pbr.expiry_date, pbr.created_at, 
                  pbr.updated_at, pbr.is_deleted, ir.reference_number, 
                  v.variety_name, v.species, v.genus, p.first_name, p.last_name, p.email`;

        const sortBy = filters.sortBy || 'application_date';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Gets PBR statistics.
     * 
     * @async
     * @returns {Promise<Object>} PBR statistics
     */
    async getStatistics() {
        return await pbrRepository.getStatistics();
    }

    /**
     * Updates PBR status.
     * 
     * @async
     * @param {string} pbrId - PBR UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated PBR
     */
    async updateStatus(pbrId, status, updatedBy, metadata = null) {
        const pbr = await pbrRepository.findById(pbrId);
        if (!pbr) {
            throw new NotFoundError('PBR not found', { pbrId });
        }

        const validTransitions = {
            'Applied': ['Under Examination', 'Rejected', 'Abandoned'],
            'Under Examination': ['Granted', 'Rejected', 'Abandoned'],
            'Granted': ['Expired', 'Maintained', 'Abandoned'],
            'Maintained': ['Expired', 'Abandoned'],
            'Rejected': [],
            'Abandoned': [],
            'Expired': []
        };

        const currentStatus = pbr.status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        return await pbrRepository.updateStatus(pbrId, status, updatedBy, metadata);
    }

    /**
     * Records a PBR renewal.
     * 
     * @async
     * @param {string} pbrId - PBR UUID
     * @param {Object} renewalData - Renewal data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated PBR
     */
    async recordRenewal(pbrId, renewalData, updatedBy) {
        return await pbrRepository.recordRenewal(pbrId, renewalData, updatedBy);
    }

    /**
     * Searches PBRs by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching PBRs
     */
    async searchPbrs(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const { executeQuery } = require('../database');
        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                pbr.pbr_id,
                pbr.application_number,
                pbr.status,
                pbr.application_date,
                pbr.grant_date,
                v.variety_name,
                v.species,
                v.genus,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name
            FROM pbr_records pbr
            JOIN ip_records ir ON pbr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN varieties v ON pbr.variety_id = v.variety_id
            WHERE pbr.is_deleted = 0
            AND (
                pbr.application_number LIKE @searchTerm
                OR v.variety_name LIKE @searchTerm
                OR v.species LIKE @searchTerm
                OR v.genus LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY pbr.application_date DESC
            OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm }
        ]);

        return result.recordset;
    }

    /**
     * Gets PBRs expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=180] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of PBRs expiring soon
     */
    async getExpiringSoon(daysThreshold = 180) {
        const { executeQuery } = require('../database');
        const query = `
            SELECT 
                pbr.pbr_id,
                pbr.application_number,
                pbr.expiry_date,
                DATEDIFF(day, GETDATE(), pbr.expiry_date) as days_until_expiry,
                v.variety_name,
                v.species,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM pbr_records pbr
            JOIN ip_records ir ON pbr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN varieties v ON pbr.variety_id = v.variety_id
            WHERE pbr.is_deleted = 0
            AND pbr.status = 'Granted'
            AND pbr.expiry_date IS NOT NULL
            AND pbr.expiry_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY pbr.expiry_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }
}

module.exports = new PbrService();