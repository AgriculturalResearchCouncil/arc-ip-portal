// src/database/repositories/trade-secret.repository.js
/**
 * Trade Secret Repository
 * =======================
 * Manages database operations for trade secret records.
 * Handles trade secret-specific data including:
 * - Secret details and description
 * - Protection measures
 * - Access control and clearance levels
 * - Confidentiality agreements
 * - Trade secret status and lifecycle
 * 
 * @module repositories/trade-secret.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * TradeSecretRepository class for managing trade secret records.
 * Extends BaseRepository with trade secret-specific operations.
 * 
 * @class TradeSecretRepository
 * @extends BaseRepository
 */
class TradeSecretRepository extends BaseRepository {
    /**
     * Creates an instance of TradeSecretRepository.
     * Initializes with the 'trade_secret_records' table and 'trade_secret_id' as primary key.
     */
    constructor() {
        super('trade_secret_records', 'trade_secret_id');
    }

    /**
     * Finds a complete trade secret record with all related data.
     * 
     * @async
     * @param {string} id - Trade Secret UUID
     * @returns {Promise<Object|null>} Complete trade secret object
     */
    async findFullTradeSecret(id) {
        if (!id) {
            throw new Error('Trade Secret ID is required');
        }

        const query = `
            SELECT 
                ts.*,
                ir.reference_number,
                ir.title,
                ir.status as ip_status,
                ir.confidentiality_level,
                p.first_name as owner_first_name,
                p.last_name as owner_last_name,
                p.email as owner_email,
                tsd.trade_secret_details_id,
                tsd.secret_type,
                tsd.secret_description,
                tsd.protection_measures,
                tsd.access_restrictions,
                tsd.creation_date,
                (
                    SELECT 
                        ca.clearance_id,
                        ca.person_id,
                        ca.clearance_level,
                        ca.approved_date,
                        ca.expiry_date,
                        pers.first_name,
                        pers.last_name,
                        pers.email
                    FROM trade_secret_clearances ca
                    JOIN persons pers ON ca.person_id = pers.person_id
                    WHERE ca.trade_secret_id = ts.trade_secret_id
                    FOR JSON PATH
                ) as clearances,
                (
                    SELECT 
                        nda.nda_id,
                        nda.agreement_reference,
                        nda.party_name,
                        nda.signed_date,
                        nda.expiry_date,
                        nda.nda_status
                    FROM trade_secret_ndas nda
                    WHERE nda.trade_secret_id = ts.trade_secret_id
                    FOR JSON PATH
                ) as ndas
            FROM trade_secret_records ts
            JOIN ip_records ir ON ts.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            LEFT JOIN trade_secret_details tsd ON ts.trade_secret_details_id = tsd.trade_secret_details_id
            WHERE ts.trade_secret_id = @id AND ts.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const tradeSecret = result.recordset[0];
        
        if (tradeSecret.clearances) {
            tradeSecret.clearances = JSON.parse(tradeSecret.clearances);
        }
        if (tradeSecret.ndas) {
            tradeSecret.ndas = JSON.parse(tradeSecret.ndas);
        }

        return tradeSecret;
    }

    /**
     * Finds trade secrets by owner.
     * 
     * @async
     * @param {string} personId - Owner UUID
     * @returns {Promise<Array>} Array of trade secrets
     */
    async findByOwner(personId) {
        if (!personId) {
            throw new Error('Person ID is required');
        }

        const query = `
            SELECT 
                ts.*,
                ir.reference_number,
                tsd.secret_type,
                tsd.secret_description
            FROM trade_secret_records ts
            JOIN ip_records ir ON ts.ip_record_id = ir.ip_record_id
            LEFT JOIN trade_secret_details tsd ON ts.trade_secret_details_id = tsd.trade_secret_details_id
            WHERE ir.owner_id = @personId AND ts.is_deleted = 0
            ORDER BY ts.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'personId', type: sql.UniqueIdentifier, value: personId }
        ]);

        return result.recordset;
    }

    /**
     * Gets trade secrets by clearance level.
     * 
     * @async
     * @param {string} clearanceLevel - Clearance level required
     * @returns {Promise<Array>} Array of trade secrets
     */
    async findByClearanceLevel(clearanceLevel) {
        if (!clearanceLevel) {
            throw new Error('Clearance level is required');
        }

        const query = `
            SELECT 
                ts.trade_secret_id,
                ts.created_at,
                ir.reference_number,
                ir.title,
                tsd.secret_type,
                tsd.secret_description,
                p.first_name + ' ' + p.last_name as owner_name
            FROM trade_secret_records ts
            JOIN ip_records ir ON ts.ip_record_id = ir.ip_record_id
            JOIN persons p ON ir.owner_id = p.person_id
            JOIN trade_secret_details tsd ON ts.trade_secret_details_id = tsd.trade_secret_details_id
            WHERE tsd.access_restrictions = @clearanceLevel AND ts.is_deleted = 0
            ORDER BY ts.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'clearanceLevel', value: clearanceLevel }
        ]);

        return result.recordset;
    }

    /**
     * Gets trade secret statistics.
     * 
     * @async
     * @returns {Promise<Object>} Trade secret statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_trade_secrets,
                COUNT(CASE WHEN ts.status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN ts.status = 'Protected' THEN 1 END) as protected,
                COUNT(CASE WHEN ts.status = 'Expired' THEN 1 END) as expired,
                COUNT(DISTINCT tsd.secret_type) as secret_types,
                COUNT(DISTINCT nda.nda_id) as total_ndas,
                COUNT(CASE WHEN nda.nda_status = 'Active' THEN 1 END) as active_ndas
            FROM trade_secret_records ts
            LEFT JOIN trade_secret_details tsd ON ts.trade_secret_details_id = tsd.trade_secret_details_id
            LEFT JOIN trade_secret_ndas nda ON nda.trade_secret_id = ts.trade_secret_id
            WHERE ts.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
    }

    /**
     * Updates trade secret status.
     * 
     * @async
     * @param {string} tradeSecretId - Trade Secret UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated trade secret
     */
    async updateStatus(tradeSecretId, status, updatedBy, metadata = null) {
        if (!tradeSecretId || !status) {
            throw new Error('Trade Secret ID and status are required');
        }

        let query = `
            UPDATE trade_secret_records
            SET status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'tradeSecretId', type: sql.UniqueIdentifier, value: tradeSecretId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE trade_secret_id = @tradeSecretId`;

        await executeQuery(query, params);

        logger.info('Trade Secret status updated', { tradeSecretId, status, updatedBy });
        return this.findById(tradeSecretId);
    }

    /**
     * Records an NDA for a trade secret.
     * 
     * @async
     * @param {string} tradeSecretId - Trade Secret UUID
     * @param {Object} ndaData - NDA data
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated trade secret
     */
    async recordNda(tradeSecretId, ndaData, updatedBy) {
        if (!tradeSecretId || !ndaData) {
            throw new Error('Trade Secret ID and NDA data are required');
        }

        const insertQuery = `
            INSERT INTO trade_secret_ndas (
                nda_id,
                trade_secret_id,
                agreement_reference,
                party_name,
                signed_date,
                expiry_date,
                nda_status,
                created_by,
                created_at
            ) VALUES (
                @ndaId,
                @tradeSecretId,
                @agreementReference,
                @partyName,
                @signedDate,
                @expiryDate,
                @ndaStatus,
                @createdBy,
                GETDATE()
            )
        `;

        const ndaId = this.generateId();
        await executeQuery(insertQuery, [
            { name: 'ndaId', type: sql.UniqueIdentifier, value: ndaId },
            { name: 'tradeSecretId', type: sql.UniqueIdentifier, value: tradeSecretId },
            { name: 'agreementReference', value: ndaData.agreementReference || `NDA-${Date.now()}` },
            { name: 'partyName', value: ndaData.partyName },
            { name: 'signedDate', value: ndaData.signedDate || new Date() },
            { name: 'expiryDate', value: ndaData.expiryDate },
            { name: 'ndaStatus', value: 'Active' },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.info('NDA recorded for trade secret', { tradeSecretId, ndaId, updatedBy });
        return this.findById(tradeSecretId);
    }

    /**
     * Grants clearance for a trade secret.
     * 
     * @async
     * @param {string} tradeSecretId - Trade Secret UUID
     * @param {string} personId - Person UUID
     * @param {string} clearanceLevel - Clearance level
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated trade secret
     */
    async grantClearance(tradeSecretId, personId, clearanceLevel, updatedBy) {
        if (!tradeSecretId || !personId || !clearanceLevel) {
            throw new Error('Trade Secret ID, Person ID, and Clearance Level are required');
        }

        const insertQuery = `
            INSERT INTO trade_secret_clearances (
                clearance_id,
                trade_secret_id,
                person_id,
                clearance_level,
                approved_date,
                created_by,
                created_at
            ) VALUES (
                @clearanceId,
                @tradeSecretId,
                @personId,
                @clearanceLevel,
                GETDATE(),
                @createdBy,
                GETDATE()
            )
        `;

        const clearanceId = this.generateId();
        await executeQuery(insertQuery, [
            { name: 'clearanceId', type: sql.UniqueIdentifier, value: clearanceId },
            { name: 'tradeSecretId', type: sql.UniqueIdentifier, value: tradeSecretId },
            { name: 'personId', type: sql.UniqueIdentifier, value: personId },
            { name: 'clearanceLevel', value: clearanceLevel },
            { name: 'createdBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.info('Clearance granted for trade secret', { tradeSecretId, personId, clearanceLevel, updatedBy });
        return this.findById(tradeSecretId);
    }
}

module.exports = new TradeSecretRepository();