// src/services/licence.service.js
/**
 * Licence Service
 * ===============
 * Business logic layer for managing licences.
 * Handles the complete licence lifecycle including:
 * - Licence creation and management
 * - Status transitions and validation
 * - Licence renewal processing
 * - Licensee management
 * - Territory management
 * - Obligation and milestone tracking
 * - Royalty structure management
 * - Licence search and reporting
 * - Business rule validation
 * - Automatic updates and notifications
 * 
 * @module services/licence.service
 * @requires ../database/repositories/licence.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../database/repositories/person.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const licenceRepository = require('../database/repositories/licence.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * LicenceService class containing all licence business logic.
 * 
 * @class LicenceService
 */
class LicenceService {
    /**
     * Creates a new licence for an IP record.
     * 
     * Steps:
     * 1. Validate required fields
     * 2. Verify IP record exists
     * 3. Check if IP record is available for licensing
     * 4. Create the licence record
     * 5. Add licensees if provided
     * 6. Add territories if provided
     * 7. Add royalty structures if provided
     * 8. Add obligations if provided
     * 9. Add milestones if provided
     * 10. Log audit trail
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {Object} data - Licence data
     * @param {string} data.licenceTitle - Licence title (required)
     * @param {string} data.licenceType - Licence type (required)
     * @param {string} data.startDate - Start date (required)
     * @param {string} [data.endDate] - End date
     * @param {string} [data.territoryScope] - Territory scope
     * @param {string} [data.exclusiveTerritory] - Exclusive territory
     * @param {Array} [data.licensees] - Array of licensee objects
     * @param {Array} [data.territories] - Array of territory objects
     * @param {Array} [data.royaltyStructures] - Array of royalty structure objects
     * @param {Array} [data.obligations] - Array of obligation objects
     * @param {Array} [data.milestones] - Array of milestone objects
     * @param {string} createdBy - User UUID creating the licence
     * @returns {Promise<Object>} Created licence
     * @throws {ValidationError} If required fields are missing
     * @throws {NotFoundError} If IP record not found
     * @throws {ForbiddenError} If IP record not available for licensing
     * 
     * @example
     * const licence = await licenceService.createLicence(
     *   ipRecordId,
     *   {
     *     licenceTitle: 'Exclusive Licence Agreement',
     *     licenceType: 'Exclusive',
     *     startDate: '2024-01-01',
     *     endDate: '2029-12-31',
     *     licensees: [
     *       { organisationName: 'Tech Corp', contactPerson: 'John Doe', email: 'john@techcorp.com' }
     *     ],
     *     royaltyStructures: [
     *       { royaltyType: 'Percentage', royaltyRate: 5, currency: 'ZAR' }
     *     ]
     *   },
     *   userId
     * );
     */
    async createLicence(ipRecordId, data, createdBy) {
        try {
            // Step 1: Validate required fields
            this.validateLicenceData(data);

            // Step 2: Verify IP record exists
            const ipRecord = await ipRecordRepository.findById(ipRecordId);
            if (!ipRecord) {
                throw new NotFoundError('IP record not found', { ipRecordId });
            }

            // Step 3: Check if IP record is available for licensing
            if (!this.isAvailableForLicensing(ipRecord)) {
                throw new ForbiddenError(
                    'IP record is not available for licensing',
                    {
                        ipRecordId,
                        currentStatus: ipRecord.status,
                        message: 'IP record must be in Approved or Granted status to be licensed'
                    }
                );
            }

            // Step 4: Create the licence record
            const licenceId = uuidv4();
            const licenceData = {
                licence_id: licenceId,
                ip_record_id: ipRecordId,
                licence_title: data.licenceTitle,
                licence_type: data.licenceType,
                licence_status: 'Draft', // Start as draft
                licence_description: data.licenceDescription || null,
                start_date: data.startDate,
                end_date: data.endDate || null,
                renewal_term: data.renewalTerm || null,
                renewal_option: data.renewalOption || null,
                territory_scope: data.territoryScope || 'Global',
                exclusive_territory: data.exclusiveTerritory || null,
                created_by: createdBy,
            };

            // Add optional fields if they exist
            if (data.renewalTerm) {
                licenceData.renewal_term = data.renewalTerm;
            }
            if (data.renewalOption) {
                licenceData.renewal_option = data.renewalOption;
            }

            const licence = await licenceRepository.create(licenceData);
            logger.info('Licence created', {
                licenceId,
                ipRecordId,
                licenceType: data.licenceType,
                createdBy
            });

            // Step 5: Add licensees if provided
            if (data.licensees && data.licensees.length > 0) {
                await this.addLicensees(licenceId, data.licensees, createdBy);
            }

            // Step 6: Add territories if provided
            if (data.territories && data.territories.length > 0) {
                await this.addTerritories(licenceId, data.territories, createdBy);
            }

            // Step 7: Add royalty structures if provided
            if (data.royaltyStructures && data.royaltyStructures.length > 0) {
                await this.addRoyaltyStructures(licenceId, data.royaltyStructures, createdBy);
            }

            // Step 8: Add obligations if provided
            if (data.obligations && data.obligations.length > 0) {
                await this.addObligations(licenceId, data.obligations, createdBy);
            }

            // Step 9: Add milestones if provided
            if (data.milestones && data.milestones.length > 0) {
                await this.addMilestones(licenceId, data.milestones, createdBy);
            }

            // Step 10: Log audit trail
            logger.logAudit('LICENCE_CREATED', createdBy, {
                licenceId,
                ipRecordId,
                licenceTitle: data.licenceTitle,
                licenceType: data.licenceType
            });

            // Return the complete licence
            return await licenceRepository.findFullLicence(licenceId);
        } catch (error) {
            logger.error('Error creating licence:', error);
            throw error;
        }
    }

    /**
     * Validates licence data.
     * 
     * @param {Object} data - Licence data to validate
     * @throws {ValidationError} If validation fails
     * @private
     */
    validateLicenceData(data) {
        const required = ['licenceTitle', 'licenceType', 'startDate'];
        const missing = required.filter(field => !data[field]);

        if (missing.length > 0) {
            throw new ValidationError('Missing required fields', {
                required: missing,
                provided: Object.keys(data)
            });
        }

        // Validate licence type
        const validTypes = ['Exclusive', 'Non-Exclusive', 'Sublicensable', 'Co-Exclusive'];
        if (!validTypes.includes(data.licenceType)) {
            throw new ValidationError('Invalid licence type', {
                licenceType: data.licenceType,
                validTypes
            });
        }

        // Validate territory scope
        const validScopes = ['Global', 'Regional', 'National', 'Specific'];
        if (data.territoryScope && !validScopes.includes(data.territoryScope)) {
            throw new ValidationError('Invalid territory scope', {
                territoryScope: data.territoryScope,
                validScopes
            });
        }

        // Validate date range
        if (data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            if (end <= start) {
                throw new ValidationError('End date must be after start date', {
                    startDate: data.startDate,
                    endDate: data.endDate
                });
            }
        }
    }

    /**
     * Checks if an IP record is available for licensing.
     * 
     * @param {Object} ipRecord - IP record object
     * @returns {boolean} True if available for licensing
     * @private
     */
    isAvailableForLicensing(ipRecord) {
        const availableStatuses = ['Approved', 'Granted', 'Registered', 'Active'];
        return availableStatuses.includes(ipRecord.status);
    }

    /**
     * Adds licensees to a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Array} licensees - Array of licensee objects
     * @param {string} createdBy - User UUID
     * @returns {Promise<boolean>} True if successful
     * @private
     */
    async addLicensees(licenceId, licensees, createdBy) {
        const { executeQuery, sql } = require('../database');

        for (const licensee of licensees) {
            // Validate licensee data
            if (!licensee.organisationName && !licensee.contactPerson) {
                throw new ValidationError('Licensee requires at least organisation name or contact person', {
                    licensee
                });
            }

            const licenseeId = uuidv4();
            const query = `
                INSERT INTO licence_licensees (
                    licensee_id,
                    licence_id,
                    organisation_name,
                    contact_person,
                    email,
                    phone,
                    address,
                    registration_number,
                    is_primary_licensee,
                    status,
                    created_by,
                    created_at
                ) VALUES (
                    @licenseeId,
                    @licenceId,
                    @organisationName,
                    @contactPerson,
                    @email,
                    @phone,
                    @address,
                    @registrationNumber,
                    @isPrimary,
                    'Active',
                    @createdBy,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'licenseeId', type: sql.UniqueIdentifier, value: licenseeId },
                { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
                { name: 'organisationName', value: licensee.organisationName || null },
                { name: 'contactPerson', value: licensee.contactPerson || null },
                { name: 'email', value: licensee.email || null },
                { name: 'phone', value: licensee.phone || null },
                { name: 'address', value: licensee.address || null },
                { name: 'registrationNumber', value: licensee.registrationNumber || null },
                { name: 'isPrimary', value: licensee.isPrimaryLicensee || false },
                { name: 'createdBy', type: sql.UniqueIdentifier, value: createdBy }
            ]);

            logger.debug('Licensee added', { licenceId, licenseeId });
        }

        return true;
    }

    /**
     * Adds territories to a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Array} territories - Array of territory objects
     * @param {string} createdBy - User UUID
     * @returns {Promise<boolean>} True if successful
     * @private
     */
    async addTerritories(licenceId, territories, createdBy) {
        const { executeQuery, sql } = require('../database');

        for (const territory of territories) {
            if (!territory.countryCode) {
                throw new ValidationError('Territory requires country code', { territory });
            }

            const territoryId = uuidv4();
            const query = `
                INSERT INTO licence_territories (
                    territory_id,
                    licence_id,
                    country_code,
                    country_name,
                    region,
                    exclusive,
                    sublicensable,
                    status,
                    created_by,
                    created_at
                ) VALUES (
                    @territoryId,
                    @licenceId,
                    @countryCode,
                    @countryName,
                    @region,
                    @exclusive,
                    @sublicensable,
                    'Active',
                    @createdBy,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'territoryId', type: sql.UniqueIdentifier, value: territoryId },
                { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
                { name: 'countryCode', value: territory.countryCode },
                { name: 'countryName', value: territory.countryName || territory.countryCode },
                { name: 'region', value: territory.region || null },
                { name: 'exclusive', value: territory.exclusive || false },
                { name: 'sublicensable', value: territory.sublicensable || false },
                { name: 'createdBy', type: sql.UniqueIdentifier, value: createdBy }
            ]);

            logger.debug('Territory added', { licenceId, territoryId });
        }

        return true;
    }

    /**
     * Adds royalty structures to a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Array} royaltyStructures - Array of royalty structure objects
     * @param {string} createdBy - User UUID
     * @returns {Promise<boolean>} True if successful
     * @private
     */
    async addRoyaltyStructures(licenceId, royaltyStructures, createdBy) {
        const { executeQuery, sql } = require('../database');

        for (const royalty of royaltyStructures) {
            // Validate royalty data
            if (!royalty.royaltyType) {
                throw new ValidationError('Royalty structure requires type', { royalty });
            }

            const royaltyId = uuidv4();
            const query = `
                INSERT INTO licence_royalty_structures (
                    royalty_structure_id,
                    licence_id,
                    royalty_type,
                    royalty_rate,
                    fixed_amount,
                    tier_threshold,
                    tier_rate,
                    calculation_method,
                    payment_terms,
                    reporting_requirements,
                    currency,
                    frequency,
                    status,
                    created_by,
                    created_at
                ) VALUES (
                    @royaltyId,
                    @licenceId,
                    @royaltyType,
                    @royaltyRate,
                    @fixedAmount,
                    @tierThreshold,
                    @tierRate,
                    @calculationMethod,
                    @paymentTerms,
                    @reportingRequirements,
                    @currency,
                    @frequency,
                    'Active',
                    @createdBy,
                    GETDATE()
                )
            `;

            const validTypes = ['Fixed', 'Percentage', 'Tiered', 'Milestone-based'];
            if (!validTypes.includes(royalty.royaltyType)) {
                throw new ValidationError('Invalid royalty type', {
                    royaltyType: royalty.royaltyType,
                    validTypes
                });
            }

            await executeQuery(query, [
                { name: 'royaltyId', type: sql.UniqueIdentifier, value: royaltyId },
                { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
                { name: 'royaltyType', value: royalty.royaltyType },
                { name: 'royaltyRate', value: royalty.royaltyRate || null },
                { name: 'fixedAmount', value: royalty.fixedAmount || null },
                { name: 'tierThreshold', value: royalty.tierThreshold || null },
                { name: 'tierRate', value: royalty.tierRate || null },
                { name: 'calculationMethod', value: royalty.calculationMethod || 'Gross Revenue' },
                { name: 'paymentTerms', value: royalty.paymentTerms || 'Net 30 Days' },
                { name: 'reportingRequirements', value: royalty.reportingRequirements || null },
                { name: 'currency', value: royalty.currency || 'ZAR' },
                { name: 'frequency', value: royalty.frequency || 'Quarterly' },
                { name: 'createdBy', type: sql.UniqueIdentifier, value: createdBy }
            ]);

            logger.debug('Royalty structure added', { licenceId, royaltyId });
        }

        return true;
    }

    /**
     * Adds obligations to a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Array} obligations - Array of obligation objects
     * @param {string} createdBy - User UUID
     * @returns {Promise<boolean>} True if successful
     * @private
     */
    async addObligations(licenceId, obligations, createdBy) {
        const { executeQuery, sql } = require('../database');

        const validTypes = ['Reporting', 'Payment', 'Milestone', 'Performance', 'Compliance'];
        
        for (const obligation of obligations) {
            if (!obligation.obligationType || !obligation.obligationDescription) {
                throw new ValidationError('Obligation requires type and description', { obligation });
            }

            if (!validTypes.includes(obligation.obligationType)) {
                throw new ValidationError('Invalid obligation type', {
                    obligationType: obligation.obligationType,
                    validTypes
                });
            }

            const obligationId = uuidv4();
            const query = `
                INSERT INTO licence_obligations (
                    obligation_id,
                    licence_id,
                    obligation_type,
                    obligation_description,
                    due_date,
                    status,
                    reminder_days,
                    notes,
                    created_by,
                    created_at
                ) VALUES (
                    @obligationId,
                    @licenceId,
                    @obligationType,
                    @obligationDescription,
                    @dueDate,
                    'Pending',
                    @reminderDays,
                    @notes,
                    @createdBy,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'obligationId', type: sql.UniqueIdentifier, value: obligationId },
                { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
                { name: 'obligationType', value: obligation.obligationType },
                { name: 'obligationDescription', value: obligation.obligationDescription },
                { name: 'dueDate', value: obligation.dueDate || null },
                { name: 'reminderDays', value: obligation.reminderDays || 30 },
                { name: 'notes', value: obligation.notes || null },
                { name: 'createdBy', type: sql.UniqueIdentifier, value: createdBy }
            ]);

            logger.debug('Obligation added', { licenceId, obligationId });
        }

        return true;
    }

    /**
     * Adds milestones to a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Array} milestones - Array of milestone objects
     * @param {string} createdBy - User UUID
     * @returns {Promise<boolean>} True if successful
     * @private
     */
    async addMilestones(licenceId, milestones, createdBy) {
        const { executeQuery, sql } = require('../database');

        for (const milestone of milestones) {
            if (!milestone.milestoneName) {
                throw new ValidationError('Milestone requires name', { milestone });
            }

            const milestoneId = uuidv4();
            const query = `
                INSERT INTO licence_milestones (
                    milestone_id,
                    licence_id,
                    milestone_name,
                    milestone_description,
                    target_date,
                    status,
                    weight,
                    notes,
                    created_by,
                    created_at
                ) VALUES (
                    @milestoneId,
                    @licenceId,
                    @milestoneName,
                    @milestoneDescription,
                    @targetDate,
                    'Planned',
                    @weight,
                    @notes,
                    @createdBy,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'milestoneId', type: sql.UniqueIdentifier, value: milestoneId },
                { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
                { name: 'milestoneName', value: milestone.milestoneName },
                { name: 'milestoneDescription', value: milestone.milestoneDescription || null },
                { name: 'targetDate', value: milestone.targetDate || null },
                { name: 'weight', value: milestone.weight || 1 },
                { name: 'notes', value: milestone.notes || null },
                { name: 'createdBy', type: sql.UniqueIdentifier, value: createdBy }
            ]);

            logger.debug('Milestone added', { licenceId, milestoneId });
        }

        return true;
    }

    /**
     * Gets a licence by ID with all related data.
     * 
     * @async
     * @param {string} id - Licence UUID
     * @returns {Promise<Object|null>} Complete licence object
     */
    async getLicenceById(id) {
        return await licenceRepository.findFullLicence(id);
    }

    /**
     * Gets all licences with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Licence status
     * @param {string} [filters.type] - Licence type
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @param {string} [userId] - User ID for role-based filtering
     * @param {string} [userRole] - User role
     * @returns {Promise<Array>} Array of licences
     */
    async getLicences(filters = {}, userId = null, userRole = null) {
        const { executeQuery } = require('../database');
        
        // Build the base query
        let query = `
            SELECT 
                lr.*,
                ir.reference_number as ip_reference,
                ir.title as ip_title,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT ll.licensee_id) as licensee_count,
                COUNT(DISTINCT lo.obligation_id) as obligation_count,
                COUNT(DISTINCT lm.milestone_id) as milestone_count,
                COUNT(DISTINCT rs.royalty_structure_id) as royalty_structure_count
            FROM licence_records lr
            JOIN ip_records ir ON lr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN licence_licensees ll ON ll.licence_id = lr.licence_id AND ll.is_deleted = 0
            LEFT JOIN licence_obligations lo ON lo.licence_id = lr.licence_id AND lo.is_deleted = 0
            LEFT JOIN licence_milestones lm ON lm.licence_id = lr.licence_id AND lm.is_deleted = 0
            LEFT JOIN licence_royalty_structures rs ON rs.licence_id = lr.licence_id AND rs.is_deleted = 0
            WHERE lr.is_deleted = 0
        `;

        const params = [];

        // Apply filters
        if (filters.status) {
            query += ` AND lr.licence_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.type) {
            query += ` AND lr.licence_type = @type`;
            params.push({ name: 'type', value: filters.type });
        }

        if (filters.dateFrom) {
            query += ` AND lr.start_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND lr.start_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        // Group by to handle counts
        query += `
            GROUP BY lr.licence_id, lr.ip_record_id, lr.licence_title, lr.licence_type,
                     lr.licence_status, lr.start_date, lr.end_date, lr.renewal_term,
                     lr.renewal_option, lr.territory_scope, lr.exclusive_territory,
                     lr.created_at, lr.updated_at, lr.is_deleted, lr.licence_description,
                     ir.reference_number, ir.title, p.first_name, p.last_name, p.email
        `;

        // Add sorting
        const sortBy = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        // Add pagination
        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Updates licence status.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated licence
     * @throws {NotFoundError} If licence not found
     * @throws {ValidationError} If status transition is invalid
     */
    async updateLicenceStatus(licenceId, status, updatedBy, metadata = null) {
        // Get the licence
        const licence = await licenceRepository.findById(licenceId);
        if (!licence) {
            throw new NotFoundError('Licence not found', { licenceId });
        }

        // Validate status transition
        const validTransitions = {
            'Draft': ['Under Review', 'Negotiation', 'Active', 'Terminated'],
            'Under Review': ['Negotiation', 'Active', 'Rejected', 'Terminated'],
            'Negotiation': ['Under Review', 'Active', 'Rejected', 'Terminated'],
            'Active': ['Expired', 'Terminated', 'Renewed'],
            'Expired': ['Renewed'],
            'Renewed': ['Active', 'Expired', 'Terminated'],
            'Rejected': [],
            'Terminated': []
        };

        const currentStatus = licence.licence_status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        // Handle special status changes
        if (status === 'Active' && currentStatus === 'Draft') {
            // Active from Draft - validate that required fields are populated
            await this.validateLicenceForActivation(licenceId);
        }

        if (status === 'Renewed') {
            // Renewal - extend the end date
            const renewalTerm = licence.renewal_term || 12;
            const newEndDate = new Date(licence.end_date || new Date());
            newEndDate.setMonth(newEndDate.getMonth() + renewalTerm);
            
            metadata = {
                ...metadata,
                end_date: newEndDate,
                renewed_at: new Date()
            };
        }

        // Update the status
        const updated = await licenceRepository.updateStatus(
            licenceId,
            status,
            updatedBy,
            metadata
        );

        logger.logAudit('LICENCE_STATUS_UPDATED', updatedBy, {
            licenceId,
            oldStatus: currentStatus,
            newStatus: status
        });

        return updated;
    }

    /**
     * Validates that a licence is ready for activation.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @throws {ValidationError} If validation fails
     * @private
     */
    async validateLicenceForActivation(licenceId) {
        const licence = await licenceRepository.findFullLicence(licenceId);
        
        // Check if there are licensees
        if (!licence.licensees || licence.licensees.length === 0) {
            throw new ValidationError('Licence must have at least one licensee before activation', {
                field: 'licensees'
            });
        }

        // Check if there are royalty structures
        if (!licence.royalty_structures || licence.royalty_structures.length === 0) {
            throw new ValidationError('Licence must have a royalty structure before activation', {
                field: 'royaltyStructures'
            });
        }

        // Check if start date is set
        if (!licence.start_date) {
            throw new ValidationError('Licence must have a start date before activation', {
                field: 'startDate'
            });
        }

        return true;
    }

    /**
     * Records a royalty payment for a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Object} paymentData - Payment data
     * @param {number} paymentData.paymentAmount - Payment amount
     * @param {string} paymentData.paymentDate - Payment date
     * @param {string} paymentData.paymentType - Payment type (Advance, Ongoing, One-time)
     * @param {string} [paymentData.paymentReference] - Payment reference
     * @param {string} [paymentData.paymentCurrency] - Currency
     * @param {string} [paymentData.calculationPeriodStart] - Period start
     * @param {string} [paymentData.calculationPeriodEnd] - Period end
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Created payment record
     */
    async recordRoyaltyPayment(licenceId, paymentData, updatedBy) {
        const { executeQuery, sql } = require('../database');

        // Validate licence exists
        const licence = await licenceRepository.findById(licenceId);
        if (!licence) {
            throw new NotFoundError('Licence not found', { licenceId });
        }

        // Validate payment data
        if (!paymentData.paymentAmount || paymentData.paymentAmount <= 0) {
            throw new ValidationError('Payment amount must be greater than 0', {
                paymentAmount: paymentData.paymentAmount
            });
        }

        if (!paymentData.paymentDate) {
            throw new ValidationError('Payment date is required');
        }

        const validTypes = ['Advance', 'Ongoing', 'One-time'];
        if (paymentData.paymentType && !validTypes.includes(paymentData.paymentType)) {
            throw new ValidationError('Invalid payment type', {
                paymentType: paymentData.paymentType,
                validTypes
            });
        }

        // Insert the payment record
        const paymentId = uuidv4();
        const query = `
            INSERT INTO licence_royalty_payments (
                payment_id,
                licence_id,
                payment_date,
                payment_amount,
                payment_currency,
                payment_reference,
                payment_type,
                payment_status,
                calculation_period_start,
                calculation_period_end,
                amount_owed,
                notes,
                created_by,
                created_at
            ) VALUES (
                @paymentId,
                @licenceId,
                @paymentDate,
                @paymentAmount,
                @paymentCurrency,
                @paymentReference,
                @paymentType,
                'Paid',
                @periodStart,
                @periodEnd,
                @paymentAmount,
                @notes,
                @createdBy,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'paymentId', type: sql.UniqueIdentifier, value: paymentId },
            { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
            { name: 'paymentDate', value: paymentData.paymentDate },
            { name: 'paymentAmount', value: paymentData.paymentAmount },
            { name: 'paymentCurrency', value: paymentData.paymentCurrency || 'ZAR' },
            { name: 'paymentReference', value: paymentData.paymentReference || null },
            { name: 'paymentType', value: paymentData.paymentType || 'Ongoing' },
            { name: 'periodStart', value: paymentData.calculationPeriodStart || null },
            { name: 'periodEnd', value: paymentData.calculationPeriodEnd || null },
            { name: 'notes', value: paymentData.notes || null },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.logAudit('ROYALTY_PAYMENT_RECORDED', updatedBy, {
            licenceId,
            paymentId,
            amount: paymentData.paymentAmount
        });

        return await licenceRepository.findFullLicence(licenceId);
    }

    /**
     * Gets royalty payment history for a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @returns {Promise<Array>} Array of royalty payments
     */
    async getRoyaltyPayments(licenceId) {
        const { executeQuery } = require('../database');

        const query = `
            SELECT 
                payment_id,
                payment_date,
                payment_amount,
                payment_currency,
                payment_reference,
                payment_type,
                payment_status,
                calculation_period_start,
                calculation_period_end,
                amount_owed,
                notes,
                created_at
            FROM licence_royalty_payments
            WHERE licence_id = @licenceId AND is_deleted = 0
            ORDER BY payment_date DESC
        `;

        const result = await executeQuery(query, [
            { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId }
        ]);

        return result.recordset;
    }

    /**
     * Gets pending obligations for a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @returns {Promise<Array>} Array of pending obligations
     */
    async getPendingObligations(licenceId) {
        const { executeQuery } = require('../database');

        const query = `
            SELECT 
                obligation_id,
                obligation_type,
                obligation_description,
                due_date,
                status,
                reminder_days,
                notes,
                DATEDIFF(day, GETDATE(), due_date) as days_overdue
            FROM licence_obligations
            WHERE licence_id = @licenceId
            AND is_deleted = 0
            AND status IN ('Pending', 'In Progress')
            ORDER BY due_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId }
        ]);

        return result.recordset;
    }

    /**
     * Updates an obligation status.
     * 
     * @async
     * @param {string} obligationId - Obligation UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {string} [notes] - Additional notes
     * @returns {Promise<Object>} Updated obligation
     */
    async updateObligationStatus(obligationId, status, updatedBy, notes = null) {
        const { executeQuery, sql } = require('../database');

        const validStatuses = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Waived'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid obligation status', {
                status,
                validStatuses
            });
        }

        let query = `
            UPDATE licence_obligations
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'obligationId', type: sql.UniqueIdentifier, value: obligationId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (status === 'Completed') {
            query += `, completion_date = GETDATE()`;
        }

        if (notes) {
            query += `, notes = @notes`;
            params.push({ name: 'notes', value: notes });
        }

        query += ` WHERE obligation_id = @obligationId`;

        await executeQuery(query, params);

        logger.logAudit('OBLIGATION_STATUS_UPDATED', updatedBy, {
            obligationId,
            newStatus: status
        });

        return await this.getObligationById(obligationId);
    }

    /**
     * Gets an obligation by ID.
     * 
     * @async
     * @param {string} obligationId - Obligation UUID
     * @returns {Promise<Object|null>} Obligation object
     */
    async getObligationById(obligationId) {
        const { executeQuery } = require('../database');

        const query = `
            SELECT * FROM licence_obligations
            WHERE obligation_id = @obligationId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'obligationId', type: sql.UniqueIdentifier, value: obligationId }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets licence statistics.
     * 
     * @async
     * @returns {Promise<Object>} Licence statistics
     */
    async getStatistics() {
        return await licenceRepository.getStatistics();
    }

    /**
     * Searches licences by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching licences
     */
    async searchLicences(searchQuery) {
        return await licenceRepository.search(searchQuery);
    }

    /**
     * Gets licences expiring soon.
     * 
     * @async
     * @param {number} [daysThreshold=90] - Days threshold for expiry alerts
     * @returns {Promise<Array>} Array of licences expiring soon
     */
    async getExpiringSoon(daysThreshold = 90) {
        return await licenceRepository.getExpiringSoon(daysThreshold);
    }

    /**
     * Gets licences by IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} [status] - Optional status filter
     * @returns {Promise<Array>} Array of licences
     */
    async getLicencesByIpRecord(ipRecordId, status = null) {
        const licences = await licenceRepository.findByIpRecord(ipRecordId);
        
        if (status) {
            return licences.filter(l => l.licence_status === status);
        }
        
        return licences;
    }

    /**
     * Gets active licences for an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of active licences
     */
    async getActiveLicences(ipRecordId) {
        return await licenceRepository.getActiveLicences(ipRecordId);
    }

    /**
     * Adds a new licensee to an existing licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {Object} licenseeData - Licensee data
     * @param {string} createdBy - User UUID
     * @returns {Promise<Object>} Updated licence
     */
    async addLicensee(licenceId, licenseeData, createdBy) {
        // Validate licence exists
        const licence = await licenceRepository.findById(licenceId);
        if (!licence) {
            throw new NotFoundError('Licence not found', { licenceId });
        }

        await this.addLicensees(licenceId, [licenseeData], createdBy);
        return await licenceRepository.findFullLicence(licenceId);
    }

    /**
     * Removes a licensee from a licence.
     * 
     * @async
     * @param {string} licenseeId - Licensee UUID
     * @param {string} updatedBy - User UUID
     * @returns {Promise<boolean>} True if successful
     */
    async removeLicensee(licenseeId, updatedBy) {
        const { executeQuery } = require('../database');

        const query = `
            UPDATE licence_licensees
            SET is_deleted = 1,
                updated_by = @updatedBy,
                updated_at = GETDATE()
            WHERE licensee_id = @licenseeId
        `;

        await executeQuery(query, [
            { name: 'licenseeId', type: sql.UniqueIdentifier, value: licenseeId },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.logAudit('LICENSEE_REMOVED', updatedBy, { licenseeId });
        return true;
    }

    /**
     * Updates a milestone status.
     * 
     * @async
     * @param {string} milestoneId - Milestone UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {string} [proofOfAchievement] - Proof of achievement
     * @returns {Promise<Object>} Updated milestone
     */
    async updateMilestoneStatus(milestoneId, status, updatedBy, proofOfAchievement = null) {
        const { executeQuery, sql } = require('../database');

        const validStatuses = ['Planned', 'In Progress', 'Achieved', 'Missed', 'Waived'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid milestone status', {
                status,
                validStatuses
            });
        }

        let query = `
            UPDATE licence_milestones
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'milestoneId', type: sql.UniqueIdentifier, value: milestoneId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (status === 'Achieved') {
            query += `, achieved_date = GETDATE()`;
        }

        if (proofOfAchievement) {
            query += `, proof_of_achievement = @proof`;
            params.push({ name: 'proof', value: proofOfAchievement });
        }

        query += ` WHERE milestone_id = @milestoneId`;

        await executeQuery(query, params);

        logger.logAudit('MILESTONE_STATUS_UPDATED', updatedBy, {
            milestoneId,
            newStatus: status
        });

        return await this.getMilestoneById(milestoneId);
    }

    /**
     * Gets a milestone by ID.
     * 
     * @async
     * @param {string} milestoneId - Milestone UUID
     * @returns {Promise<Object|null>} Milestone object
     */
    async getMilestoneById(milestoneId) {
        const { executeQuery } = require('../database');

        const query = `
            SELECT * FROM licence_milestones
            WHERE milestone_id = @milestoneId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'milestoneId', type: sql.UniqueIdentifier, value: milestoneId }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Gets upcoming milestones for a licence.
     * 
     * @async
     * @param {string} licenceId - Licence UUID
     * @param {number} [daysThreshold=30] - Days threshold
     * @returns {Promise<Array>} Array of upcoming milestones
     */
    async getUpcomingMilestones(licenceId, daysThreshold = 30) {
        const { executeQuery } = require('../database');

        const query = `
            SELECT 
                milestone_id,
                milestone_name,
                milestone_description,
                target_date,
                status,
                weight,
                DATEDIFF(day, GETDATE(), target_date) as days_until
            FROM licence_milestones
            WHERE licence_id = @licenceId
            AND is_deleted = 0
            AND status IN ('Planned', 'In Progress')
            AND target_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY target_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'licenceId', type: sql.UniqueIdentifier, value: licenceId },
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }
}

// Export a singleton instance of the service
module.exports = new LicenceService();