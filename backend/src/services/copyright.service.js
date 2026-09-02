// src/services/copyright.service.js
/**
 * Copyright Service
 * =================
 * Business logic layer for managing copyrights.
 * Handles copyright lifecycle including:
 * - Copyright creation from disclosures
 * - Author management
 * - Work details management
 * - Status transitions
 * - Copyright searches
 * - License management
 * 
 * @module services/copyright.service
 * @requires ../database/repositories/copyright.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const copyrightRepository = require('../database/repositories/copyright.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

class CopyrightService {
    async createCopyrightFromDisclosure(disclosureId, data) {
        try {
            if (!data.workTitle || !data.workType || !data.creationDate) {
                throw new ValidationError('Missing required fields', {
                    required: ['workTitle', 'workType', 'creationDate'],
                    provided: Object.keys(data)
                });
            }

            const disclosure = await disclosureRepository.findById(disclosureId);
            if (!disclosure) {
                throw new NotFoundError('Disclosure not found', { disclosureId });
            }

            const ipRecord = await ipRecordRepository.findById(disclosure.ip_record_id);
            if (!ipRecord) {
                throw new NotFoundError('IP record not found', { ipRecordId: disclosure.ip_record_id });
            }

            // Create copyright details
            const detailsId = uuidv4();
            await this.createCopyrightDetails(detailsId, data);

            // Create copyright record
            const copyrightId = uuidv4();
            const copyrightData = {
                copyright_id: copyrightId,
                ip_record_id: ipRecord.ip_record_id,
                copyright_details_id: detailsId,
                registration_date: data.registrationDate || new Date(),
                status: data.status || 'Registered',
                created_by: ipRecord.owner_id,
            };

            if (data.registrationNumber) {
                copyrightData.registration_number = data.registrationNumber;
            }

            const copyright = await copyrightRepository.create(copyrightData);

            if (data.authors && data.authors.length > 0) {
                await this.addAuthors(copyrightId, data.authors);
            }

            if (data.licenses && data.licenses.length > 0) {
                await this.addLicenses(copyrightId, data.licenses);
            }

            await ipRecordRepository.updateStatus(
                ipRecord.ip_record_id,
                'Copyright Registered',
                ipRecord.owner_id
            );

            logger.info('Copyright created from disclosure', {
                copyrightId,
                disclosureId,
                workTitle: data.workTitle
            });

            return copyright;
        } catch (error) {
            logger.error('Error creating copyright:', error);
            throw error;
        }
    }

    async createCopyrightDetails(detailsId, data) {
        const { executeQuery, sql } = require('../database');

        const query = `
            INSERT INTO copyright_details (
                copyright_details_id,
                work_title,
                work_type,
                work_description,
                creation_date,
                publication_date,
                isbn,
                issn,
                keywords,
                created_at
            ) VALUES (
                @detailsId,
                @workTitle,
                @workType,
                @workDescription,
                @creationDate,
                @publicationDate,
                @isbn,
                @issn,
                @keywords,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'detailsId', type: sql.UniqueIdentifier, value: detailsId },
            { name: 'workTitle', value: data.workTitle },
            { name: 'workType', value: data.workType },
            { name: 'workDescription', value: data.workDescription || null },
            { name: 'creationDate', value: data.creationDate },
            { name: 'publicationDate', value: data.publicationDate || null },
            { name: 'isbn', value: data.isbn || null },
            { name: 'issn', value: data.issn || null },
            { name: 'keywords', value: data.keywords || null },
        ]);

        return true;
    }

    async addAuthors(copyrightId, authors) {
        const { executeQuery, sql } = require('../database');

        for (const author of authors) {
            let personId = author.personId;
            
            if (!personId && author.email) {
                const existingPerson = await personRepository.findByEmail(author.email);
                if (existingPerson) {
                    personId = existingPerson.person_id;
                }
            }

            if (!personId) {
                const newPerson = await personRepository.create({
                    first_name: author.firstName,
                    last_name: author.lastName,
                    email: author.email || `author-${Date.now()}@example.com`,
                    employee_number: author.employeeNumber || null,
                    position_title: author.positionTitle || 'Author',
                    active: 1,
                });
                personId = newPerson.person_id;
            }

            const query = `
                INSERT INTO copyright_authors (
                    author_id,
                    copyright_id,
                    person_id,
                    is_primary_author,
                    contribution_percentage,
                    created_at
                ) VALUES (
                    @id,
                    @copyrightId,
                    @personId,
                    @isPrimary,
                    @contributionPercentage,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'copyrightId', type: sql.UniqueIdentifier, value: copyrightId },
                { name: 'personId', type: sql.UniqueIdentifier, value: personId },
                { name: 'isPrimary', value: author.isPrimaryAuthor || false },
                { name: 'contributionPercentage', value: author.contributionPercentage || null },
            ]);
        }

        return true;
    }

    async addLicenses(copyrightId, licenses) {
        const { executeQuery, sql } = require('../database');

        for (const license of licenses) {
            const query = `
                INSERT INTO copyright_licenses (
                    license_id,
                    copyright_id,
                    license_type,
                    licensee_name,
                    license_date,
                    expiry_date,
                    terms_conditions,
                    created_at
                ) VALUES (
                    @id,
                    @copyrightId,
                    @licenseType,
                    @licenseeName,
                    @licenseDate,
                    @expiryDate,
                    @termsConditions,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'copyrightId', type: sql.UniqueIdentifier, value: copyrightId },
                { name: 'licenseType', value: license.licenseType || 'Standard' },
                { name: 'licenseeName', value: license.licenseeName },
                { name: 'licenseDate', value: license.licenseDate || new Date() },
                { name: 'expiryDate', value: license.expiryDate || null },
                { name: 'termsConditions', value: license.termsConditions || null },
            ]);
        }

        return true;
    }

    async getCopyrightById(id) {
        return await copyrightRepository.findFullCopyright(id);
    }

    async getCopyrights(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher') {
            return await copyrightRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        let query = `
            SELECT 
                cr.*,
                ir.reference_number,
                cd.work_title,
                cd.work_type,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT ca.author_id) as author_count,
                COUNT(DISTINCT cl.license_id) as license_count
            FROM copyright_records cr
            JOIN ip_records ir ON cr.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN copyright_details cd ON cr.copyright_details_id = cd.copyright_details_id
            LEFT JOIN copyright_authors ca ON ca.copyright_id = cr.copyright_id
            LEFT JOIN copyright_licenses cl ON cl.copyright_id = cr.copyright_id
            WHERE cr.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND cr.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.workType) {
            query += ` AND cd.work_type = @workType`;
            params.push({ name: 'workType', value: filters.workType });
        }

        if (filters.dateFrom) {
            query += ` AND cr.registration_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND cr.registration_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` GROUP BY cr.copyright_id, cr.ip_record_id, cr.registration_number,
                  cr.registration_date, cr.status, cr.created_at, cr.updated_at,
                  cr.is_deleted, ir.reference_number, cd.work_title, cd.work_type,
                  p.first_name, p.last_name, p.email`;

        const sortBy = filters.sortBy || 'registration_date';
        const sortOrder = filters.sortOrder || 'DESC';
        query += ` ORDER BY ${sortBy} ${sortOrder}`;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    async getStatistics() {
        return await copyrightRepository.getStatistics();
    }

    async updateStatus(copyrightId, status, updatedBy, metadata = null) {
        const copyright = await copyrightRepository.findById(copyrightId);
        if (!copyright) {
            throw new NotFoundError('Copyright not found', { copyrightId });
        }

        const validTransitions = {
            'Pending': ['Registered', 'Rejected', 'Abandoned'],
            'Registered': ['Expired', 'Licensed', 'Abandoned'],
            'Licensed': ['Expired', 'Abandoned'],
            'Rejected': [],
            'Abandoned': [],
            'Expired': []
        };

        const currentStatus = copyright.status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        return await copyrightRepository.updateStatus(copyrightId, status, updatedBy, metadata);
    }

    async searchCopyrights(searchQuery) {
        return await copyrightRepository.search(searchQuery);
    }

    async findByRegistrationNumber(registrationNumber) {
        return await copyrightRepository.findByRegistrationNumber(registrationNumber);
    }

    async findByAuthor(personId) {
        return await copyrightRepository.findByAuthor(personId);
    }

    async findByWorkType(workType) {
        return await copyrightRepository.findByWorkType(workType);
    }
}

module.exports = new CopyrightService();