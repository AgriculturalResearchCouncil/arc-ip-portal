/**
 * Disclosure Service
 * ==================
 * Business logic layer for managing invention disclosures.
 * Handles the complete disclosure lifecycle including:
 * - Creation of new disclosures
 * - Submission for review
 * - TTO review workflow
 * - Status management
 * - Notification generation
 * - Business rule validation
 * 
 * @module services/disclosure.service
 * @requires ../database/repositories/disclosure.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../database/repositories/person.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const disclosureRepository = require('../database/repositories/disclosure.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * DisclosureService class containing all disclosure business logic.
 * 
 * @class DisclosureService
 */
class DisclosureService {
    /**
     * Creates a new disclosure.
     * 
     * Steps:
     * 1. Validate required fields
     * 2. Verify researcher exists
     * 3. Create IP record
     * 4. Generate reference number
     * 5. Create disclosure record
     * 6. Log audit trail
     * 
     * @async
     * @param {string} researcherId - UUID of the researcher
     * @param {Object} data - Disclosure data
     * @param {string} data.title - Disclosure title (required)
     * @param {string} data.disclosureCategory - Category (required)
     * @param {string} [data.noveltyDescription] - Description of novelty
     * @param {string} [data.commercialisationPotential] - Commercial potential
     * @param {string} [data.confidentialityLevel] - Confidentiality level
     * @param {Date} [data.disclosureDate] - Date of disclosure
     * @param {Array} [data.inventors] - Array of inventor objects
     * @returns {Promise<Object>} Created disclosure
     * @throws {ValidationError} If required fields are missing
     * @throws {NotFoundError} If researcher not found
     * 
     * @example
     * const disclosure = await disclosureService.createDisclosure(
     *   researcherId,
     *   {
     *     title: 'Novel Agricultural Pest Control Method',
     *     disclosureCategory: 'Innovation',
     *     noveltyDescription: 'New method using biological agents...',
     *     inventors: [
     *       { firstName: 'John', lastName: 'Doe', email: 'john@arc.agric.za' }
     *     ]
     *   }
     * );
     */
    async createDisclosure(researcherId, data) {
        try {
            // Step 1: Validate required fields
            if (!data.title || !data.disclosureCategory) {
                throw new ValidationError('Missing required fields', {
                    required: ['title', 'disclosureCategory'],
                    provided: Object.keys(data)
                });
            }

            // Step 2: Verify researcher exists
            const researcher = await personRepository.findById(researcherId);
            if (!researcher) {
                throw new NotFoundError('Researcher not found', {
                    researcherId,
                    message: 'The specified researcher does not exist or is inactive'
                });
            }

            // Step 3: Create IP Record
            const ipRecordId = uuidv4();
            const referenceNumber = await this.generateReferenceNumber();

            const ipRecordData = {
                ip_record_id: ipRecordId,
                reference_number: referenceNumber,
                record_type: 'Disclosure',
                title: data.title,
                description: data.noveltyDescription || '',
                owner_id: researcherId,
                status: 'Draft',
                confidentiality_level: data.confidentialityLevel || 'Confidential',
                created_by: researcherId,
            };

            await ipRecordRepository.create(ipRecordData);
            logger.debug('IP record created', { ipRecordId, referenceNumber });

            // Step 4: Create Disclosure
            const disclosureData = {
                disclosure_id: uuidv4(),
                ip_record_id: ipRecordId,
                disclosure_date: data.disclosureDate || new Date(),
                disclosure_category: data.disclosureCategory,
                novelty_description: data.noveltyDescription || null,
                commercialisation_potential: data.commercialisationPotential || null,
                review_status: 'Draft',
            };

            const disclosure = await disclosureRepository.create(disclosureData);
            logger.info('Disclosure created', {
                disclosureId: disclosure.disclosure_id,
                researcherId,
                title: data.title,
                referenceNumber
            });

            // Step 5: Add inventors if provided
            if (data.inventors && data.inventors.length > 0) {
                await this.addInventors(ipRecordId, data.inventors);
            }

            // Step 6: Log audit trail
            logger.logAudit('DISCLOSURE_CREATED', researcherId, {
                disclosureId: disclosure.disclosure_id,
                title: data.title,
                category: data.disclosureCategory
            });

            return disclosure;
        } catch (error) {
            logger.error('Error creating disclosure:', error);
            throw error;
        }
    }

    /**
     * Generates a unique reference number for IP records.
     * Format: ARC-IP-YYYY-XXXX (e.g., ARC-IP-2024-0001)
     * 
     * @async
     * @returns {Promise<string>} Generated reference number
     */
    async generateReferenceNumber() {
        const year = new Date().getFullYear();
        const count = await ipRecordRepository.count();
        const sequence = String(count + 1).padStart(4, '0');
        return `ARC-IP-${year}-${sequence}`;
    }

    /**
     * Adds inventors to an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {Array} inventors - Array of inventor objects
     * @param {string} inventors[].firstName - First name
     * @param {string} inventors[].lastName - Last name
     * @param {string} inventors[].email - Email address
     * @param {number} [inventors[].contributionPercentage] - Percentage contribution
     * @returns {Promise<boolean>} True if successful
     */
    async addInventors(ipRecordId, inventors) {
        const { executeQuery, sql } = require('../database');

        for (const inventor of inventors) {
            // Check if person already exists
            let personId = inventor.personId;
            
            if (!personId && inventor.email) {
                // Try to find by email
                const existingPerson = await personRepository.findByEmail(inventor.email);
                if (existingPerson) {
                    personId = existingPerson.person_id;
                }
            }

            // Create new person if not found
            if (!personId) {
                const newPerson = await personRepository.create({
                    first_name: inventor.firstName,
                    last_name: inventor.lastName,
                    email: inventor.email || `inventor-${Date.now()}@example.com`,
                    employee_number: inventor.employeeNumber || null,
                    position_title: inventor.positionTitle || null,
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
                { name: 'roleType', value: inventor.role || 'Inventor' },
                { name: 'contributionPercentage', value: inventor.contributionPercentage || null },
            ]);

            logger.debug('Inventor added', { ipRecordId, personId });
        }

        return true;
    }

    /**
     * Submits a disclosure for TTO review.
     * 
     * Steps:
     * 1. Validate disclosure exists
     * 2. Verify ownership (only the researcher can submit)
     * 3. Validate current status (must be Draft)
     * 4. Update status to 'Submitted'
     * 5. Log audit trail
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {string} researcherId - UUID of the researcher submitting
     * @returns {Promise<Object>} Updated disclosure
     * @throws {NotFoundError} If disclosure not found
     * @throws {ForbiddenError} If user doesn't own the disclosure
     * @throws {ValidationError} If disclosure is not in Draft status
     * 
     * @example
     * const submitted = await disclosureService.submitDisclosure(
     *   disclosureId,
     *   researcherId
     * );
     */
    async submitDisclosure(disclosureId, researcherId) {
        // Step 1: Get disclosure
        const disclosure = await disclosureRepository.findById(disclosureId);
        
        if (!disclosure) {
            throw new NotFoundError('Disclosure not found', { disclosureId });
        }

        // Step 2: Verify ownership
        const ipRecord = await ipRecordRepository.findById(disclosure.ip_record_id);
        if (ipRecord.owner_id !== researcherId) {
            throw new ForbiddenError('You can only submit your own disclosures', {
                ownerId: ipRecord.owner_id,
                userId: researcherId
            });
        }

        // Step 3: Validate status
        if (disclosure.review_status !== 'Draft') {
            throw new ValidationError('Disclosure must be in Draft status to submit', {
                currentStatus: disclosure.review_status,
                allowedStatus: 'Draft'
            });
        }

        // Step 4: Update status
        const updatedIpRecord = await ipRecordRepository.updateStatus(
            disclosure.ip_record_id, 
            'Submitted', 
            researcherId
        );

        const updated = await disclosureRepository.update(disclosureId, {
            review_status: 'Submitted',
            submitted_at: new Date(),
        });

        // Step 5: Log audit
        logger.logAudit('DISCLOSURE_SUBMITTED', researcherId, {
            disclosureId,
            title: disclosure.title,
            referenceNumber: ipRecord.reference_number
        });

        logger.info('Disclosure submitted', {
            disclosureId,
            researcherId,
            referenceNumber: ipRecord.reference_number
        });

        return updated;
    }

    /**
     * Reviews a disclosure (TTO staff only).
     * 
     * Steps:
     * 1. Validate disclosure exists
     * 2. Validate current status (must be Submitted or Under Review)
     * 3. Update status to new status
     * 4. Update IP record status
     * 5. Log audit trail
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {string} reviewerId - UUID of the reviewer
     * @param {Object} data - Review data
     * @param {string} data.status - New status (Under Review, Approved, Rejected, etc.)
     * @param {string} [data.recommendation] - Review recommendation/comments
     * @returns {Promise<Object>} Updated disclosure
     * @throws {NotFoundError} If disclosure not found
     * @throws {ValidationError} If status transition is invalid
     * 
     * @example
     * const reviewed = await disclosureService.reviewDisclosure(
     *   disclosureId,
     *   reviewerId,
     *   { status: 'Approved', recommendation: 'Recommended for patent filing' }
     * );
     */
    async reviewDisclosure(disclosureId, reviewerId, data) {
        // Step 1: Get disclosure
        const disclosure = await disclosureRepository.findById(disclosureId);
        
        if (!disclosure) {
            throw new NotFoundError('Disclosure not found', { disclosureId });
        }

        // Step 2: Validate current status
        const allowedStatuses = ['Submitted', 'Under Review'];
        if (!allowedStatuses.includes(disclosure.review_status)) {
            throw new ValidationError(
                'Disclosure must be in Submitted or Under Review status to review',
                {
                    currentStatus: disclosure.review_status,
                    allowedStatuses
                }
            );
        }

        // Step 3: Validate new status
        const validNewStatuses = ['Under Review', 'Reviewed', 'Recommended', 'Rejected', 'Approved'];
        if (!validNewStatuses.includes(data.status)) {
            throw new ValidationError('Invalid status transition', {
                requestedStatus: data.status,
                validStatuses: validNewStatuses
            });
        }

        // Step 4: Update disclosure status
        const updated = await disclosureRepository.updateStatus(
            disclosureId,
            data.status,
            reviewerId,
            data.recommendation || null
        );

        // Step 5: Update IP record status if approved or rejected
        let ipStatus = data.status;
        if (data.status === 'Approved') {
            ipStatus = 'Approved';
        } else if (data.status === 'Rejected') {
            ipStatus = 'Rejected';
        } else if (data.status === 'Recommended') {
            ipStatus = 'Under Review';
        }

        await ipRecordRepository.updateStatus(
            disclosure.ip_record_id,
            ipStatus,
            reviewerId
        );

        // Step 6: Log audit
        logger.logAudit('DISCLOSURE_REVIEWED', reviewerId, {
            disclosureId,
            newStatus: data.status,
            recommendation: data.recommendation
        });

        logger.info('Disclosure reviewed', {
            disclosureId,
            reviewerId,
            newStatus: data.status
        });

        return updated;
    }

    /**
     * Gets all disclosures with filters.
     * 
     * @async
     * @param {Object} [filters={}] - Filter options
     * @param {string} [userId] - Current user ID (for permission filtering)
     * @param {string} [userRole] - Current user role
     * @returns {Promise<Array>} Array of disclosures
     */
    async getAllDisclosures(filters = {}, userId = null, userRole = null) {
        // If researcher, only show their own disclosures
        if (userRole === 'Researcher') {
            return await disclosureRepository.findByResearcher(userId);
        }

        // For TTO and Admin, show all with filters
        return await disclosureRepository.findWithFilters(filters);
    }

    /**
     * Gets a single disclosure by ID with full details.
     * 
     * @async
     * @param {string} id - Disclosure UUID
     * @returns {Promise<Object|null>} Disclosure object or null
     */
    async getDisclosureById(id) {
        return await disclosureRepository.findFullDisclosure(id);
    }

    /**
     * Gets disclosure statistics.
     * 
     * @async
     * @returns {Promise<Object>} Statistics object
     */
    async getStatistics() {
        return await disclosureRepository.getStatistics();
    }

    /**
     * Gets pending disclosures for TTO review.
     * 
     * @async
     * @returns {Promise<Array>} Array of pending disclosures
     */
    async getPendingReviews() {
        return await disclosureRepository.getPendingReviews();
    }

    /**
     * Gets category breakdown of disclosures.
     * 
     * @async
     * @returns {Promise<Array>} Category breakdown
     */
    async getCategoryBreakdown() {
        return await disclosureRepository.getCategoryBreakdown();
    }

    /**
     * Gets monthly disclosure trends.
     * 
     * @async
     * @param {number} [months=12] - Number of months
     * @returns {Promise<Array>} Monthly trends
     */
    async getMonthlyTrends(months = 12) {
        return await disclosureRepository.getMonthlyTrends(months);
    }

    /**
     * Searches disclosures by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching disclosures
     */
    async searchDisclosures(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }
        return await disclosureRepository.search(searchQuery);
    }
}

module.exports = new DisclosureService();