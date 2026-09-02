// src/services/patent.service.js
/**
 * Patent Service
 * ==============
 * Business logic layer for managing patents.
 * Handles patent lifecycle including:
 * - Patent creation and registration
 * - Jurisdiction management
 * - Renewal tracking
 * - Patent family management
 * - Status transitions
 * - Patent searches
 * 
 * @module services/patent.service
 * @requires ../database/repositories/patent.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const patentRepository = require('../database/repositories/patent.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * PatentService class containing all patent business logic.
 * 
 * @class PatentService
 */
class PatentService {
    /**
     * Creates a new patent from a disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {Object} data - Patent data
     * @param {string} data.applicationNumber - Patent application number
     * @param {string} data.filingDate - Filing date
     * @param {string} data.title - Patent title
     * @param {Array} data.jurisdictions - Jurisdictions to file in
     * @param {Array} data.inventors - Inventor details
     * @param {string} data.agent - Patent agent details
     * @param {string} data.priorityDate - Priority date
     * @returns {Promise<Object>} Created patent
     * @throws {ValidationError} If required fields are missing
     * @throws {NotFoundError} If disclosure not found
     * 
     * @example
     * const patent = await patentService.createPatentFromDisclosure(
     *   disclosureId,
     *   {
     *     applicationNumber: 'ZA2024/12345',
     *     filingDate: '2024-01-15',
     *     title: 'Novel Agricultural Method',
     *     jurisdictions: ['ZA', 'US', 'EP'],
     *     inventors: [{ firstName: 'John', lastName: 'Doe', email: 'john@arc.agric.za' }]
     *   }
     * );
     */
    async createPatentFromDisclosure(disclosureId, data) {
        try {
            // Validate required fields
            if (!data.applicationNumber || !data.filingDate || !data.title) {
                throw new ValidationError('Missing required fields', {
                    required: ['applicationNumber', 'filingDate', 'title'],
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

            // Create patent record
            const patentId = uuidv4();
            const patentData = {
                patent_id: patentId,
                ip_record_id: ipRecord.ip_record_id,
                application_number: data.applicationNumber,
                filing_date: data.filingDate,
                priority_date: data.priorityDate || null,
                title: data.title,
                abstract: data.abstract || null,
                description: data.description || null,
                claims: data.claims || null,
                status: 'Filed',
                agent: data.agent || null,
                created_by: ipRecord.owner_id,
            };

            const patent = await patentRepository.create(patentData);

            // Add jurisdictions
            if (data.jurisdictions && data.jurisdictions.length > 0) {
                await this.addJurisdictions(patentId, data.jurisdictions);
            }

            // Add inventors if provided
            if (data.inventors && data.inventors.length > 0) {
                await this.addInventors(ipRecord.ip_record_id, data.inventors);
            }

            // Update IP record status
            await ipRecordRepository.updateStatus(
                ipRecord.ip_record_id,
                'Patent Filed',
                ipRecord.owner_id
            );

            logger.info('Patent created from disclosure', {
                patentId,
                disclosureId,
                applicationNumber: data.applicationNumber
            });

            return patent;
        } catch (error) {
            logger.error('Error creating patent:', error);
            throw error;
        }
    }

    /**
     * Adds jurisdictions to a patent.
     * 
     * @async
     * @param {string} patentId - Patent UUID
     * @param {Array} jurisdictions - Jurisdiction codes
     * @returns {Promise<boolean>} True if successful
     */
    async addJurisdictions(patentId, jurisdictions) {
        const { executeQuery, sql } = require('../database');

        for (const jurisdiction of jurisdictions) {
            const query = `
                INSERT INTO patent_jurisdictions (
                    jurisdiction_id,
                    patent_id,
                    jurisdiction_code,
                    jurisdiction_name,
                    filing_date,
                    status,
                    created_at
                ) VALUES (
                    @id,
                    @patentId,
                    @jurisdictionCode,
                    @jurisdictionName,
                    @filingDate,
                    'Pending',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'patentId', type: sql.UniqueIdentifier, value: patentId },
                { name: 'jurisdictionCode', value: jurisdiction.code },
                { name: 'jurisdictionName', value: jurisdiction.name || jurisdiction.code },
                { name: 'filingDate', value: jurisdiction.filingDate || new Date() },
            ]);
        }

        return true;
    }

    /**
     * Adds inventors to a patent.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {Array} inventors - Array of inventor objects
     * @returns {Promise<boolean>} True if successful
     */
    async addInventors(ipRecordId, inventors) {
        const { executeQuery, sql } = require('../database');

        for (const inventor of inventors) {
            // Check if person exists
            let personId = inventor.personId;
            
            if (!personId && inventor.email) {
                const existingPerson = await personRepository.findByEmail(inventor.email);
                if (existingPerson) {
                    personId = existingPerson.person_id;
                }
            }

            // Create person if not found
            if (!personId) {
                const newPerson = await personRepository.create({
                    first_name: inventor.firstName,
                    last_name: inventor.lastName,
                    email: inventor.email || `inventor-${Date.now()}@example.com`,
                    employee_number: inventor.employeeNumber || null,
                    position_title: inventor.positionTitle || 'Inventor',
                    active: 1,
                });
                personId = newPerson.person_id;
            }

            // Link person to IP record
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
                    'Inventor',
                    @contributionPercentage,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
                { name: 'personId', type: sql.UniqueIdentifier, value: personId },
                { name: 'contributionPercentage', value: inventor.contributionPercentage || null },
            ]);
        }

        return true;
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
     * Gets all patents with filtering.
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
        // If researcher, only show their own
        if (userRole === 'Researcher') {
            return await patentRepository.findByOwner(userId);
        }

        // For TTO and Admin, show all with filters
        // Build filter query
        let query = `
            SELECT 
                pr.*,
                ir.reference_number,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT pj.jurisdiction_id) as jurisdiction_count
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN patent_jurisdictions pj ON pj.patent_id = pr.patent_id
            WHERE pr.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND pr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.jurisdiction) {
            query += ` AND EXISTS (
                SELECT 1 FROM patent_jurisdictions pj2 
                WHERE pj2.patent_id = pr.patent_id AND pj2.jurisdiction_code = @jurisdiction
            )`;
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

        query += ` GROUP BY pr.patent_id, pr.ip_record_id, pr.application_number, pr.title, pr.status, 
                  pr.filing_date, pr.grant_date, pr.expiry_date, pr.abstract, pr.description, 
                  pr.claims, pr.agent, pr.priority_date, pr.created_at, pr.updated_at, pr.is_deleted,
                  ir.reference_number, ir.title, p.first_name, p.last_name, p.email`;

        // Add sorting
        const sortBy = filters.sortBy || 'filing_date';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Add pagination
        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const { executeQuery } = require('../database');
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
     * Gets pending patent renewals.
     * 
     * @async
     * @param {number} [daysThreshold=90] - Days threshold for renewal alerts
     * @returns {Promise<Array>} Array of patents needing renewal
     */
    async getPendingRenewals(daysThreshold = 90) {
        return await patentRepository.getPendingRenewals(daysThreshold);
    }

    /**
     * Records a patent renewal.
     * 
     * @async
     * @param {string} patentId - Patent UUID
     * @param {Object} renewalData - Renewal data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated patent
     */
    async recordRenewal(patentId, renewalData, updatedBy) {
        return await patentRepository.recordRenewal(patentId, renewalData, updatedBy);
    }

    /**
     * Updates patent status.
     * 
     * @async
     * @param {string} patentId - Patent UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated patent
     */
    async updateStatus(patentId, status, updatedBy, metadata = null) {
        const patent = await patentRepository.findById(patentId);
        if (!patent) {
            throw new NotFoundError('Patent not found', { patentId });
        }

        // Validate status transition
        const validTransitions = {
            'Filed': ['Under Examination', 'Rejected', 'Abandoned'],
            'Under Examination': ['Granted', 'Rejected', 'Abandoned'],
            'Granted': ['Expired', 'Maintained', 'Abandoned'],
            'Maintained': ['Expired', 'Abandoned'],
            'Rejected': [],
            'Abandoned': [],
            'Expired': []
        };

        const currentStatus = patent.status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        return await patentRepository.updateStatus(patentId, status, updatedBy, metadata);
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

        const { executeQuery } = require('../database');
        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                pr.patent_id,
                pr.application_number,
                pr.title,
                pr.status,
                pr.filing_date,
                pr.grant_date,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                COUNT(pj.jurisdiction_id) as jurisdiction_count
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN patent_jurisdictions pj ON pj.patent_id = pr.patent_id
            WHERE pr.is_deleted = 0
            AND (
                pr.application_number LIKE @searchTerm
                OR pr.title LIKE @searchTerm
                OR pr.abstract LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            GROUP BY pr.patent_id, pr.application_number, pr.title, pr.status, 
                     pr.filing_date, pr.grant_date, ir.reference_number, 
                     p.first_name, p.last_name
            ORDER BY pr.filing_date DESC
            OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm }
        ]);

        return result.recordset;
    }

    /**
     * Gets patent by application number.
     * 
     * @async
     * @param {string} applicationNumber - Patent application number
     * @returns {Promise<Object|null>} Patent object
     */
    async findByApplicationNumber(applicationNumber) {
        if (!applicationNumber) {
            throw new Error('Application number is required');
        }

        const query = `
            SELECT * FROM patent_records 
            WHERE application_number = @applicationNumber AND is_deleted = 0
        `;

        const { executeQuery } = require('../database');
        const result = await executeQuery(query, [
            { name: 'applicationNumber', value: applicationNumber }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets patents expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=180] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of patents expiring soon
     */
    async getExpiringSoon(daysThreshold = 180) {
        const query = `
            SELECT 
                pr.patent_id,
                pr.application_number,
                pr.title,
                pr.expiry_date,
                DATEDIFF(day, GETDATE(), pr.expiry_date) as days_until_expiry,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM patent_records pr
            JOIN ip_records ir ON pr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            WHERE pr.is_deleted = 0
            AND pr.status = 'Granted'
            AND pr.expiry_date IS NOT NULL
            AND pr.expiry_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY pr.expiry_date ASC
        `;

        const { executeQuery } = require('../database');
        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }
}

module.exports = new PatentService();