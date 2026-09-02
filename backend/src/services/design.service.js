// src/services/design.service.js
/**
 * Design Service
 * ==============
 * Business logic layer for managing designs.
 * Handles design lifecycle including:
 * - Design creation from disclosures
 * - Jurisdiction management
 * - Renewal tracking
 * - Status transitions
 * - Design searches
 * 
 * @module services/design.service
 * @requires ../database/repositories/design.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const designRepository = require('../database/repositories/design.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

class DesignService {
    async createDesignFromDisclosure(disclosureId, data) {
        try {
            if (!data.designName || !data.registrationDate) {
                throw new ValidationError('Missing required fields', {
                    required: ['designName', 'registrationDate'],
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

            // Create design details
            const detailsId = uuidv4();
            await this.createDesignDetails(detailsId, data);

            // Create design record
            const designId = uuidv4();
            const designData = {
                design_id: designId,
                ip_record_id: ipRecord.ip_record_id,
                design_details_id: detailsId,
                registration_date: data.registrationDate,
                status: data.status || 'Registered',
                created_by: ipRecord.owner_id,
            };

            if (data.registrationNumber) {
                designData.registration_number = data.registrationNumber;
            }

            const design = await designRepository.create(designData);

            if (data.jurisdictions && data.jurisdictions.length > 0) {
                await this.addJurisdictions(designId, data.jurisdictions);
            }

            await ipRecordRepository.updateStatus(
                ipRecord.ip_record_id,
                'Design Registered',
                ipRecord.owner_id
            );

            logger.info('Design created from disclosure', {
                designId,
                disclosureId,
                designName: data.designName
            });

            return design;
        } catch (error) {
            logger.error('Error creating design:', error);
            throw error;
        }
    }

    async createDesignDetails(detailsId, data) {
        const { executeQuery, sql } = require('../database');

        const query = `
            INSERT INTO design_details (
                design_details_id,
                design_name,
                design_description,
                design_features,
                design_type,
                created_at
            ) VALUES (
                @detailsId,
                @designName,
                @designDescription,
                @designFeatures,
                @designType,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'detailsId', type: sql.UniqueIdentifier, value: detailsId },
            { name: 'designName', value: data.designName },
            { name: 'designDescription', value: data.designDescription || null },
            { name: 'designFeatures', value: data.designFeatures || null },
            { name: 'designType', value: data.designType || 'Industrial' },
        ]);

        return true;
    }

    async addJurisdictions(designId, jurisdictions) {
        const { executeQuery, sql } = require('../database');

        for (const jurisdiction of jurisdictions) {
            const query = `
                INSERT INTO design_jurisdictions (
                    jurisdiction_id,
                    design_id,
                    jurisdiction_code,
                    jurisdiction_name,
                    registration_date,
                    expiry_date,
                    status,
                    created_at
                ) VALUES (
                    @id,
                    @designId,
                    @jurisdictionCode,
                    @jurisdictionName,
                    @registrationDate,
                    @expiryDate,
                    'Active',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'designId', type: sql.UniqueIdentifier, value: designId },
                { name: 'jurisdictionCode', value: jurisdiction.code },
                { name: 'jurisdictionName', value: jurisdiction.name || jurisdiction.code },
                { name: 'registrationDate', value: jurisdiction.registrationDate || new Date() },
                { name: 'expiryDate', value: jurisdiction.expiryDate || null },
            ]);
        }

        return true;
    }

    async getDesignById(id) {
        return await designRepository.findFullDesign(id);
    }

    async getDesigns(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher') {
            return await designRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        let query = `
            SELECT 
                d.*,
                ir.reference_number,
                dd.design_name,
                dd.design_type,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT dj.jurisdiction_id) as jurisdiction_count
            FROM design_records d
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN design_details dd ON d.design_details_id = dd.design_details_id
            LEFT JOIN design_jurisdictions dj ON dj.design_id = d.design_id
            WHERE d.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND d.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.designType) {
            query += ` AND dd.design_type = @designType`;
            params.push({ name: 'designType', value: filters.designType });
        }

        if (filters.dateFrom) {
            query += ` AND d.registration_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND d.registration_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` GROUP BY d.design_id, d.ip_record_id, d.registration_number,
                  d.registration_date, d.expiry_date, d.status, d.created_at,
                  d.updated_at, d.is_deleted, ir.reference_number,
                  dd.design_name, dd.design_type, p.first_name, p.last_name, p.email`;

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
        return await designRepository.getStatistics();
    }

    async updateStatus(designId, status, updatedBy, metadata = null) {
        const design = await designRepository.findById(designId);
        if (!design) {
            throw new NotFoundError('Design not found', { designId });
        }

        const validTransitions = {
            'Pending': ['Registered', 'Rejected', 'Abandoned'],
            'Registered': ['Expired', 'Renewed', 'Abandoned'],
            'Renewed': ['Expired', 'Abandoned'],
            'Rejected': [],
            'Abandoned': [],
            'Expired': []
        };

        const currentStatus = design.status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        return await designRepository.updateStatus(designId, status, updatedBy, metadata);
    }

    async recordRenewal(designId, renewalData, updatedBy) {
        return await designRepository.recordRenewal(designId, renewalData, updatedBy);
    }

    async searchDesigns(searchQuery) {
        return await designRepository.search(searchQuery);
    }

    async findByRegistrationNumber(registrationNumber) {
        return await designRepository.findByRegistrationNumber(registrationNumber);
    }

    async getExpiringSoon(daysThreshold = 180) {
        return await designRepository.getExpiringSoon(daysThreshold);
    }

    async findByType(designType) {
        return await designRepository.findByType(designType);
    }
}

module.exports = new DesignService();