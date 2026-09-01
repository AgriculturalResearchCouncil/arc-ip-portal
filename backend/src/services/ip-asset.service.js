/**
 * IP Asset Service
 * ================
 * Business logic layer for managing intellectual property assets.
 * Handles all IP-related operations including:
 * - Creating and managing IP records
 * - Status transitions
 * - Patent, PBR, Trademark, Copyright specific logic
 * - Relationship management between IP assets
 * - Document association
 * 
 * @module services/ip-asset.service
 * @requires ../database/repositories/ip-record.repository
 * @requires ../database/repositories/person.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * IpAssetService class containing all IP asset business logic.
 * 
 * @class IpAssetService
 */
class IpAssetService {
    /**
     * Creates a new IP asset record.
     * 
     * @async
     * @param {string} ownerId - UUID of the owner
     * @param {Object} data - IP asset data
     * @param {string} data.title - Asset title (required)
     * @param {string} data.recordType - Type of IP (Patent, Trademark, etc.)
     * @param {string} [data.description] - Asset description
     * @param {string} [data.registrationNumber] - Registration number
     * @param {Date} [data.filingDate] - Filing date
     * @param {Date} [data.expiryDate] - Expiry date
     * @param {string} [data.jurisdiction] - Jurisdiction
     * @param {string} [data.status] - Initial status
     * @param {Array} [data.persons] - Related persons (inventors, agents)
     * @returns {Promise<Object>} Created IP asset
     * @throws {ValidationError} If required fields are missing
     * @throws {NotFoundError} If owner not found
     */
    async createIpAsset(ownerId, data) {
        try {
            // Validate required fields
            if (!data.title || !data.recordType) {
                throw new ValidationError('Missing required fields', {
                    required: ['title', 'recordType'],
                    provided: Object.keys(data)
                });
            }

            // Verify owner exists
            const owner = await personRepository.findById(ownerId);
            if (!owner) {
                throw new NotFoundError('Owner not found', { ownerId });
            }

            // Generate reference number
            const referenceNumber = await this.generateReferenceNumber(data.recordType);

            // Create IP record
            const ipRecordData = {
                ip_record_id: uuidv4(),
                reference_number: referenceNumber,
                record_type: data.recordType,
                title: data.title,
                description: data.description || '',
                owner_id: ownerId,
                status: data.status || 'Draft',
                confidentiality_level: data.confidentialityLevel || 'Confidential',
                created_by: ownerId,
                registration_number: data.registrationNumber || null,
                filing_date: data.filingDate || null,
                expiry_date: data.expiryDate || null,
                jurisdiction: data.jurisdiction || null,
            };

            const record = await ipRecordRepository.create(ipRecordData);
            logger.info('IP asset created', {
                recordId: record.ip_record_id,
                ownerId,
                recordType: data.recordType,
                referenceNumber
            });

            // Add related persons if provided
            if (data.persons && data.persons.length > 0) {
                await this.addRelatedPersons(record.ip_record_id, data.persons);
            }

            return record;
        } catch (error) {
            logger.error('Error creating IP asset:', error);
            throw error;
        }
    }

    /**
     * Generates a unique reference number based on IP type.
     * 
     * @async
     * @param {string} recordType - Type of IP record
     * @returns {Promise<string>} Generated reference number
     */
    async generateReferenceNumber(recordType) {
        const year = new Date().getFullYear();
        const count = await ipRecordRepository.count({ record_type: recordType });
        const sequence = String(count + 1).padStart(4, '0');
        
        const typeCode = {
            'Patent': 'PAT',
            'Trademark': 'TM',
            'Copyright': 'COP',
            'PBR': 'PBR',
            'TradeSecret': 'TS'
        }[recordType] || 'IP';

        return `ARC-${typeCode}-${year}-${sequence}`;
    }

    /**
     * Adds related persons to an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {Array} persons - Array of person objects
     * @returns {Promise<boolean>} True if successful
     */
    async addRelatedPersons(ipRecordId, persons) {
        const { executeQuery, sql } = require('../database');

        for (const person of persons) {
            // Check if person exists
            let personId = person.personId;
            
            if (!personId && person.email) {
                const existingPerson = await personRepository.findByEmail(person.email);
                if (existingPerson) {
                    personId = existingPerson.person_id;
                }
            }

            // Create person if not found
            if (!personId) {
                const newPerson = await personRepository.create({
                    first_name: person.firstName,
                    last_name: person.lastName,
                    email: person.email || `person-${Date.now()}@example.com`,
                    employee_number: person.employeeNumber || null,
                    position_title: person.positionTitle || null,
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
                    @roleType,
                    @contributionPercentage,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
                { name: 'personId', type: sql.UniqueIdentifier, value: personId },
                { name: 'roleType', value: person.role || 'Contributor' },
                { name: 'contributionPercentage', value: person.contributionPercentage || null },
            ]);

            logger.debug('Person linked to IP record', { ipRecordId, personId });
        }

        return true;
    }

    /**
     * Updates an IP asset status.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} status - New status
     * @param {string} updatedBy - UUID of user making the change
     * @param {string} [comment] - Optional comment
     * @returns {Promise<Object>} Updated IP asset
     */
    async updateStatus(ipRecordId, status, updatedBy, comment = null) {
        // Validate record exists
        const record = await ipRecordRepository.findById(ipRecordId);
        if (!record) {
            throw new NotFoundError('IP record not found', { ipRecordId });
        }

        // Validate status transition
        const validTransitions = this.getValidStatusTransitions(record.record_type);
        const currentStatus = record.status;
        
        if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        // Update record
        const updated = await ipRecordRepository.updateStatus(ipRecordId, status, updatedBy);

        // Log lifecycle event
        await this.logLifecycleEvent(ipRecordId, status, updatedBy, comment);

        logger.info('IP asset status updated', {
            ipRecordId,
            status,
            updatedBy,
            comment
        });

        return updated;
    }

    /**
     * Gets valid status transitions for a record type.
     * 
     * @param {string} recordType - Type of IP record
     * @returns {Object} Status transition map
     */
    getValidStatusTransitions(recordType) {
        const commonTransitions = {
            'Draft': ['Submitted'],
            'Submitted': ['Under Review', 'Rejected'],
            'Under Review': ['Filed', 'Rejected', 'Abandoned'],
            'Filed': ['Granted', 'Rejected', 'Abandoned'],
            'Granted': ['Expired', 'Abandoned'],
            'Rejected': [],
            'Abandoned': [],
            'Expired': []
        };

        // Additional transitions for specific record types
        const typeSpecific = {
            'Patent': {
                'Filed': ['Published', 'Granted', 'Rejected']
            },
            'Trademark': {
                'Filed': ['Published', 'Registered', 'Rejected']
            }
        };

        return typeSpecific[recordType] 
            ? { ...commonTransitions, ...typeSpecific[recordType] }
            : commonTransitions;
    }

    /**
     * Logs a lifecycle event for an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} newStatus - New status
     * @param {string} performedBy - UUID of user
     * @param {string} [comment] - Optional comment
     * @returns {Promise<boolean>} True if successful
     */
    async logLifecycleEvent(ipRecordId, newStatus, performedBy, comment = null) {
        const { executeQuery, sql } = require('../database');

        const record = await ipRecordRepository.findById(ipRecordId);
        const query = `
            INSERT INTO ip_lifecycle_events (
                event_id,
                ip_record_id,
                event_type,
                status_from,
                status_to,
                event_date,
                comments,
                performed_by
            ) VALUES (
                @eventId,
                @ipRecordId,
                @eventType,
                @statusFrom,
                @statusTo,
                GETDATE(),
                @comments,
                @performedBy
            )
        `;

        await executeQuery(query, [
            { name: 'eventId', type: sql.UniqueIdentifier, value: uuidv4() },
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
            { name: 'eventType', value: 'STATUS_CHANGE' },
            { name: 'statusFrom', value: record.status },
            { name: 'statusTo', value: newStatus },
            { name: 'comments', value: comment || null },
            { name: 'performedBy', type: sql.UniqueIdentifier, value: performedBy },
        ]);

        return true;
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
     * Gets all IP assets with filtering.
     * 
     * @async
     * @param {Object} filters - Filter options
     * @param {string} [filters.type] - Record type
     * @param {string} [filters.status] - Status
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of IP assets
     */
    async getIpAssets(filters = {}) {
        if (filters.type) {
            return await ipRecordRepository.findByType(filters.type, filters);
        }
        return await ipRecordRepository.findAll(filters);
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