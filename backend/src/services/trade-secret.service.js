// src/services/trade-secret.service.js
/**
 * Trade Secret Service
 * ====================
 * Business logic layer for managing trade secrets.
 * Handles trade secret lifecycle including:
 * - Trade secret creation from disclosures
 * - Clearance management
 * - NDA management
 * - Access control
 * - Status transitions
 * - Trade secret searches
 * 
 * @module services/trade-secret.service
 * @requires ../database/repositories/trade-secret.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const tradeSecretRepository = require('../database/repositories/trade-secret.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

class TradeSecretService {
    async createTradeSecretFromDisclosure(disclosureId, data) {
        try {
            if (!data.secretType || !data.secretDescription) {
                throw new ValidationError('Missing required fields', {
                    required: ['secretType', 'secretDescription'],
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

            // Create trade secret details
            const detailsId = uuidv4();
            await this.createTradeSecretDetails(detailsId, data);

            // Create trade secret record
            const tradeSecretId = uuidv4();
            const tradeSecretData = {
                trade_secret_id: tradeSecretId,
                ip_record_id: ipRecord.ip_record_id,
                trade_secret_details_id: detailsId,
                status: data.status || 'Active',
                created_by: ipRecord.owner_id,
            };

            const tradeSecret = await tradeSecretRepository.create(tradeSecretData);

            if (data.clearances && data.clearances.length > 0) {
                await this.addClearances(tradeSecretId, data.clearances);
            }

            if (data.ndas && data.ndas.length > 0) {
                await this.addNdas(tradeSecretId, data.ndas);
            }

            // Update IP record status
            await ipRecordRepository.updateStatus(
                ipRecord.ip_record_id,
                'Trade Secret Protected',
                ipRecord.owner_id
            );

            logger.info('Trade secret created from disclosure', {
                tradeSecretId,
                disclosureId,
                secretType: data.secretType
            });

            return tradeSecret;
        } catch (error) {
            logger.error('Error creating trade secret:', error);
            throw error;
        }
    }

    async createTradeSecretDetails(detailsId, data) {
        const { executeQuery, sql } = require('../database');

        const query = `
            INSERT INTO trade_secret_details (
                trade_secret_details_id,
                secret_type,
                secret_description,
                protection_measures,
                access_restrictions,
                creation_date,
                created_at
            ) VALUES (
                @detailsId,
                @secretType,
                @secretDescription,
                @protectionMeasures,
                @accessRestrictions,
                @creationDate,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'detailsId', type: sql.UniqueIdentifier, value: detailsId },
            { name: 'secretType', value: data.secretType },
            { name: 'secretDescription', value: data.secretDescription },
            { name: 'protectionMeasures', value: data.protectionMeasures || null },
            { name: 'accessRestrictions', value: data.accessRestrictions || 'Confidential' },
            { name: 'creationDate', value: data.creationDate || new Date() },
        ]);

        return true;
    }

    async addClearances(tradeSecretId, clearances) {
        const { executeQuery, sql } = require('../database');

        for (const clearance of clearances) {
            const person = await personRepository.findById(clearance.personId);
            if (!person) {
                throw new NotFoundError('Person not found', { personId: clearance.personId });
            }

            const query = `
                INSERT INTO trade_secret_clearances (
                    clearance_id,
                    trade_secret_id,
                    person_id,
                    clearance_level,
                    approved_date,
                    expiry_date,
                    created_at
                ) VALUES (
                    @id,
                    @tradeSecretId,
                    @personId,
                    @clearanceLevel,
                    @approvedDate,
                    @expiryDate,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'tradeSecretId', type: sql.UniqueIdentifier, value: tradeSecretId },
                { name: 'personId', type: sql.UniqueIdentifier, value: clearance.personId },
                { name: 'clearanceLevel', value: clearance.clearanceLevel },
                { name: 'approvedDate', value: clearance.approvedDate || new Date() },
                { name: 'expiryDate', value: clearance.expiryDate || null },
            ]);
        }

        return true;
    }

    async addNdas(tradeSecretId, ndas) {
        const { executeQuery, sql } = require('../database');

        for (const nda of ndas) {
            const query = `
                INSERT INTO trade_secret_ndas (
                    nda_id,
                    trade_secret_id,
                    agreement_reference,
                    party_name,
                    signed_date,
                    expiry_date,
                    nda_status,
                    created_at
                ) VALUES (
                    @id,
                    @tradeSecretId,
                    @agreementReference,
                    @partyName,
                    @signedDate,
                    @expiryDate,
                    'Active',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'id', type: sql.UniqueIdentifier, value: uuidv4() },
                { name: 'tradeSecretId', type: sql.UniqueIdentifier, value: tradeSecretId },
                { name: 'agreementReference', value: nda.agreementReference || `NDA-${Date.now()}` },
                { name: 'partyName', value: nda.partyName },
                { name: 'signedDate', value: nda.signedDate || new Date() },
                { name: 'expiryDate', value: nda.expiryDate || null },
            ]);
        }

        return true;
    }

    async getTradeSecretById(id) {
        return await tradeSecretRepository.findFullTradeSecret(id);
    }

    async getTradeSecrets(filters = {}, userId = null, userRole = null) {
        if (userRole === 'Researcher') {
            return await tradeSecretRepository.findByOwner(userId);
        }

        const { executeQuery } = require('../database');
        let query = `
            SELECT 
                ts.*,
                ir.reference_number,
                tsd.secret_type,
                tsd.secret_description,
                tsd.access_restrictions,
                p.first_name + ' ' + p.last_name as owner_name,
                p.email as owner_email,
                COUNT(DISTINCT ca.clearance_id) as clearance_count,
                COUNT(DISTINCT nda.nda_id) as nda_count
            FROM trade_secret_records ts
            JOIN ip_records ir ON ts.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN trade_secret_details tsd ON ts.trade_secret_details_id = tsd.trade_secret_details_id
            LEFT JOIN trade_secret_clearances ca ON ca.trade_secret_id = ts.trade_secret_id
            LEFT JOIN trade_secret_ndas nda ON nda.trade_secret_id = ts.trade_secret_id
            WHERE ts.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND ts.status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.secretType) {
            query += ` AND tsd.secret_type = @secretType`;
            params.push({ name: 'secretType', value: filters.secretType });
        }

        if (filters.clearanceLevel) {
            query += ` AND tsd.access_restrictions = @clearanceLevel`;
            params.push({ name: 'clearanceLevel', value: filters.clearanceLevel });
        }

        query += ` GROUP BY ts.trade_secret_id, ts.ip_record_id, ts.status,
                  ts.created_at, ts.updated_at, ts.is_deleted, ir.reference_number,
                  tsd.secret_type, tsd.secret_description, tsd.access_restrictions,
                  p.first_name, p.last_name, p.email`;

        const sortBy = filters.sortBy || 'created_at';
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
        return await tradeSecretRepository.getStatistics();
    }

    async updateStatus(tradeSecretId, status, updatedBy, metadata = null) {
        const tradeSecret = await tradeSecretRepository.findById(tradeSecretId);
        if (!tradeSecret) {
            throw new NotFoundError('Trade secret not found', { tradeSecretId });
        }

        const validTransitions = {
            'Active': ['Protected', 'Expired', 'Abandoned'],
            'Protected': ['Active', 'Expired', 'Abandoned'],
            'Expired': [],
            'Abandoned': []
        };

        const currentStatus = tradeSecret.status;
        if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
            throw new ValidationError('Invalid status transition', {
                currentStatus,
                requestedStatus: status,
                allowedTransitions: validTransitions[currentStatus] || []
            });
        }

        return await tradeSecretRepository.updateStatus(tradeSecretId, status, updatedBy, metadata);
    }

    async recordNda(tradeSecretId, ndaData, updatedBy) {
        return await tradeSecretRepository.recordNda(tradeSecretId, ndaData, updatedBy);
    }

    async grantClearance(tradeSecretId, personId, clearanceLevel, updatedBy) {
        return await tradeSecretRepository.grantClearance(
            tradeSecretId,
            personId,
            clearanceLevel,
            updatedBy
        );
    }

    async searchTradeSecrets(searchQuery) {
        return await tradeSecretRepository.search(searchQuery);
    }

    async getByClearanceLevel(clearanceLevel) {
        return await tradeSecretRepository.findByClearanceLevel(clearanceLevel);
    }
}

module.exports = new TradeSecretService();