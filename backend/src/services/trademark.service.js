// src/services/trademark.service.js
/**
 * Trademark Service
 * =================
 * Business logic layer for managing trademarks.
 * Handles trademark lifecycle including:
 * - Trademark creation from disclosures
 * - Class management
 * - Jurisdiction management
 * - Renewal tracking
 * - Status transitions
 * - Trademark searches
 * 
 * @module services/trademark.service
 * @requires ../database/repositories/trademark.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const trademarkRepository = require('../database/repositories/trademark.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

class TrademarkService {
    async createTrademarkFromDisclosure(disclosureId, data) {
        try {
            if (!data.trademarkName || !data.filingDate) {
                throw new ValidationError('Missing required fields', {
                    required: ['trademarkName', 'filingDate'],
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

            // Create trademark details
            const detailsId = uuidv4();
            await this.createTrademarkDetails(detailsId, data);

            // Create trademark record
            const trademarkId = uuidv4();
            const trademarkData = {
                trademark_id: trademarkId,
                ip_record_id: ipRecord.ip_record_id,
                trademark_details_id: detailsId,
                filing_date: data.filingDate,
                trademark_type: data.trademarkType || 'Word',
                status: 'Applied',
                created_by: ipRecord.owner_id,
            };

            if (data.registrationNumber) {
                trademarkData.registration_number = data.registrationNumber;
            }

            const trademark = await trademarkRepository.create(trademarkData);

            if (data.classes && data.classes.length > 0) {
                await this.addClasses(trademarkId, data.classes);
            }

            if (data.jurisdictions && data.jurisdictions.length > 0) {
                await this.addJurisdictions(trademarkId, data.jurisdictions);
            }

            await ipRecordRepository.updateStatus(
                ipRecord.ip_record_id,
                'Trademark Filed',
                ipRecord.owner_id
            );

            logger.info('Trademark created from disclosure', {
                trademarkId,
                disclosureId,
                trademarkName: data.trademarkName
            });

            return trademark;
        } catch (error) {
            logger.error('Error creating trademark:', error);
            throw error;
        }
    }

    async createTrademarkDetails(detailsId, data) {
        const { executeQuery, sql } = require('../database');

        const query = `
            INSERT INTO trademark_details (
                trademark_details_id,
                trademark_name,
                logo_url,
                slogan,
                trademark_type,
                goods_services,
                created_at
            ) VALUES (
                @detailsId,
                @trademarkName,
                @logoUrl,
                @slogan,
                @trademarkType,
                @goodsServices,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'detailsId', type: sql.UniqueIdentifier, value: detailsId },
            { name: 'trademarkName', value: data.trademarkName },
            { name: 'logoUrl', value: data.logoUrl || null },
            { name: 'slogan', value: data.slogan || null },
            { name: 'trademarkType', value: data.trademarkType || 'Word' },
            { name: 'goodsServices', value: data.goodsServices || null },
        ]);

        return true;
    }

    async addClasses(trademarkId, classes) {
        const { executeQuery, sql } = require('../database');

        for (const cls of classes) {
            const query = `
                INSERT INTO trademark_classes (
                    class_id,
                    trademark_id,
                    class_number,
                    class_description,
                    goods_services_list,
                    created_at
                ) VALUES (
                    @id,
                    @trademarkId,
                    @classNumber,
                    @classDescription,
                    @goodsServicesList,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'trademarkId', type: sql.UniqueIdentifier, value: trademarkId },
                { name: 'classNumber', value: cls.classNumber },
                { name: 'classDescription', value: cls.classDescription || `Class ${cls.classNumber}` },
                { name: 'goodsServicesList', value: cls.goodsServices || null },
            ]);
        }

        return true;
    }

    async addJurisdictions(trademarkId, jurisdictions) {
        const { executeQuery, sql } = require('../database');

        for (const jurisdiction of jurisdictions) {
            const query = `
                INSERT INTO trademark_jurisdictions (
                    jurisdiction_id,
                    trademark_id,
                    jurisdiction_code,
                    jurisdiction_name,
                    registration_date,
                    status,
                    created_at
                ) VALUES (
                    @id,
                    @trademarkId,
                    @jurisdictionCode,
                    @jurisdictionName,
                    @registrationDate,
                    'Pending',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'trademarkId', type: sql.UniqueIdentifier, value: trademarkId },
                { name: 'jurisdictionCode', value: jurisdiction.code },
                { name: 'jurisdictionName', value: jurisdiction.name || jurisdiction.code },
                { name: 'registrationDate', value: jurisdiction.registrationDate || new Date() },
            ]);
        }

        return true;
    }

    async getTrademarkById(id) {
        return await trademarkRepository.findFullTrademark(id);
    }

    async getTrademarks(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher') {
            return await trademarkRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        let query = `
            SELECT 
                tm.*,
                ir.reference_number,
                td.trademark_name,
                td.trademark_type,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT tc.class_id) as class_count,
                COUNT(DISTINCT tj.jurisdiction_id) as jurisdiction_count
            FROM trademark_records tm
            JOIN ip_records ir ON tm.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            LEFT JOIN trademark_classes tc ON tc.trademark_id = tm.trademark_id
            LEFT JOIN trademark_jurisdictions tj ON tj.trademark_id = tm.trademark_id
            WHERE tm.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND tm.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.trademarkType) {
            query += ` AND td.trademark_type = @trademarkType`;
            params.push({ name: 'trademarkType', value: filters.trademarkType });
        }

        if (filters.classNumber) {
            query += ` AND EXISTS (
                SELECT 1 FROM trademark_classes tc2 
                WHERE tc2.trademark_id = tm.trademark_id AND tc2.class_number = @classNumber
            )`;
            params.push({ name: 'classNumber', value: filters.classNumber });
        }

        if (filters.dateFrom) {
            query += ` AND tm.filing_date >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND tm.filing_date <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += ` GROUP BY tm.trademark_id, tm.ip_record_id, tm.registration_number, tm.filing_date,
                  tm.registration_date, tm.status, tm.trademark_type, tm.created_at, tm.updated_at,
                  tm.is_deleted, ir.reference_number, td.trademark_name, td.trademark_type,
                  p.first_name, p.last_name, p.email`;

        const sortBy = filters.sortBy || 'filing_date';
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
        return await trademarkRepository.getStatistics();
    }

    async updateStatus(trademarkId, status, updatedBy, metadata = null) {
        const trademark = await trademarkRepository.findById(trademarkId);
        if (!trademark) {
            throw new NotFoundError('Trademark not found', { trademarkId });
        }

        const validTransitions = {
            'Applied': ['Under Examination', 'Rejected', 'Abandoned'],
            'Under Examination': ['Published', 'Rejected', 'Abandoned'],
            'Published': ['Registered', 'Rejected', 'Abandoned'],
            'Registered': ['Expired', 'Renewed', 'Abandoned'],
            'Renewed': ['Expired', 'Abandoned'],
            'Rejected': [],
            'Abandoned': [],
            'Expired': []
        };

        const currentStatus = trademark.status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        return await trademarkRepository.updateStatus(trademarkId, status, updatedBy, metadata);
    }

    async recordRenewal(trademarkId, renewalData, updatedBy) {
        return await trademarkRepository.recordRenewal(trademarkId, renewalData, updatedBy);
    }

    async searchTrademarks(searchQuery) {
        return await trademarkRepository.search(searchQuery);
    }

    async findByRegistrationNumber(registrationNumber) {
        return await trademarkRepository.findByRegistrationNumber(registrationNumber);
    }

    async getExpiringSoon(daysThreshold = 180) {
        const { executeQuery } = require('../database');
        const query = `
            SELECT 
                tm.trademark_id,
                tm.registration_number,
                tm.expiry_date,
                DATEDIFF(day, GETDATE(), tm.expiry_date) as days_until_expiry,
                td.trademark_name,
                ir.reference_number,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email
            FROM trademark_records tm
            JOIN ip_records ir ON tm.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN trademark_details td ON tm.trademark_details_id = td.trademark_details_id
            WHERE tm.is_deleted = 0
            AND tm.status = 'Registered'
            AND tm.expiry_date IS NOT NULL
            AND tm.expiry_date <= DATEADD(day, @daysThreshold, GETDATE())
            ORDER BY tm.expiry_date ASC
        `;

        const result = await executeQuery(query, [
            { name: 'daysThreshold', value: daysThreshold }
        ]);

        return result.recordset;
    }
}

module.exports = new TrademarkService();