// src/database/repositories/document.repository.js
/**
 * Document Repository
 * ===================
 * Manages database operations for documents table.
 * 
 * Database Schema (documents):
 * - document_id (uniqueidentifier, PK)
 * - ip_record_id (uniqueidentifier, FK to ip_records)
 * - document_type (nvarchar, required)
 * - file_name (nvarchar, required)
 * - file_url (nvarchar, nullable)
 * - file_size (bigint, nullable)
 * - version_number (int, nullable)
 * - sharepoint_id (nvarchar, nullable)
 * - sharepoint_url (nvarchar, nullable)
 * - sharepoint_folder (nvarchar, nullable)
 * - sharepoint_site_id (nvarchar, nullable)
 * - sharepoint_drive_id (nvarchar, nullable)
 * - sharepoint_item_id (nvarchar, nullable)
 * - is_archived (bit, nullable) - 1 = archived, 0 = active
 * - uploaded_by (uniqueidentifier, nullable, FK to persons)
 * - uploaded_at (datetime2, nullable)
 * - updated_at (datetime2, nullable)
 * 
 * Note: There is NO 'is_deleted' column. Use is_archived instead.
 * 
 * @module repositories/document.repository
 * @requires ./base.repository
 * @requires ../index
 * @requires ../../logging/logger
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * DocumentRepository class for managing documents.
 * 
 * @class DocumentRepository
 * @extends BaseRepository
 */
class DocumentRepository extends BaseRepository {
    constructor() {
        super('documents', 'document_id');
    }

    /**
     * Finds a document with all related data.
     * 
     * @async
     * @param {string} id - Document UUID
     * @returns {Promise<Object|null>} Complete document object
     */
    async findFullDocument(id) {
        if (!id) {
            throw new Error('Document ID is required');
        }

        const query = `
            SELECT 
                d.*,
                p.first_name + ' ' + p.last_name as uploaded_by_name,
                p.email as uploaded_by_email,
                ir.reference_number as ip_reference,
                ir.title as ip_title
            FROM documents d
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            LEFT JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            WHERE d.document_id = @id
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        return result.recordset[0] || null;
    }

    /**
     * Finds all documents for an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @returns {Promise<Array>} Array of documents
     */
    async findByIpRecord(ipRecordId) {
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                d.*,
                p.first_name + ' ' + p.last_name as uploaded_by_name
            FROM documents d
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            WHERE d.ip_record_id = @ipRecordId
            ORDER BY d.uploaded_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId }
        ]);

        return result.recordset;
    }

    /**
     * Gets document version history.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} documentType - Type of document
     * @returns {Promise<Array>} Array of document versions
     */
    async getVersionHistory(ipRecordId, documentType) {
        if (!ipRecordId) {
            throw new Error('IP Record ID is required');
        }

        const query = `
            SELECT 
                document_id,
                file_name,
                file_size,
                version_number,
                uploaded_at,
                uploaded_by,
                p.first_name + ' ' + p.last_name as uploaded_by_name
            FROM documents d
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            WHERE ip_record_id = @ipRecordId
            AND document_type = @documentType
            ORDER BY version_number DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
            { name: 'documentType', value: documentType }
        ]);

        return result.recordset;
    }

    /**
     * Archives a document (soft delete using is_archived).
     * 
     * @async
     * @param {string} id - Document UUID
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Archived document
     */
    async archiveDocument(id, updatedBy) {
        if (!id) {
            throw new Error('Document ID is required');
        }

        const query = `
            UPDATE documents
            SET is_archived = 1,
                updated_at = GETDATE()
            WHERE document_id = @id
        `;

        await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        logger.info('Document archived', { id, updatedBy });
        return this.findById(id);
    }

    /**
     * Searches documents by filename or description.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {number} [limit=20] - Max results
     * @returns {Promise<Array>} Array of matching documents
     */
    async search(searchQuery, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                d.document_id,
                d.file_name,
                d.document_type,
                d.file_size,
                d.uploaded_at,
                d.is_archived,
                d.ip_record_id,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as uploaded_by_name
            FROM documents d
            LEFT JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            WHERE (
                d.file_name LIKE @searchTerm
                OR d.document_type LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY d.uploaded_at DESC
            OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm },
            { name: 'limit', value: limit }
        ]);

        return result.recordset;
    }
}

module.exports = new DocumentRepository();