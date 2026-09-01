/**
 * Document Repository
 * ===================
 * Manages database operations for the documents table.
 * Handles document CRUD, versioning, and file management.
 * 
 * @module repositories/document.repository
 * @requires ./base.repository
 * @requires ../index
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
    /**
     * Creates an instance of DocumentRepository.
     * Initializes with the 'documents' table and 'document_id' as primary key.
     */
    constructor() {
        super('documents', 'document_id');
    }

    /**
     * Finds a document with all related data including uploader info.
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
                p.first_name as uploader_first_name,
                p.last_name as uploader_last_name,
                p.email as uploader_email,
                ir.reference_number as ip_reference,
                ir.title as ip_title
            FROM documents d
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            LEFT JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            WHERE d.document_id = @id AND d.is_deleted = 0
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
            WHERE d.ip_record_id = @ipRecordId AND d.is_deleted = 0
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
                file_extension,
                version_number,
                uploaded_at,
                uploaded_by,
                is_confidential,
                description,
                version_comment,
                p.first_name + ' ' + p.last_name as uploaded_by_name
            FROM documents d
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            WHERE ip_record_id = @ipRecordId 
            AND document_type = @documentType
            AND is_deleted = 0
            ORDER BY version_number DESC
        `;

        const result = await executeQuery(query, [
            { name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId },
            { name: 'documentType', value: documentType }
        ]);

        return result.recordset;
    }

    /**
     * Soft deletes a document.
     * 
     * @async
     * @param {string} id - Document UUID
     * @returns {Promise<boolean>} True if successful
     */
    async delete(id) {
        const query = `
            UPDATE documents
            SET is_deleted = 1, deleted_at = GETDATE()
            WHERE document_id = @id
        `;
        await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);
        return true;
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
                d.is_confidential,
                d.ip_record_id,
                ir.reference_number as ip_reference,
                p.first_name + ' ' + p.last_name as uploaded_by_name
            FROM documents d
            LEFT JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            LEFT JOIN persons p ON d.uploaded_by = p.person_id
            WHERE d.is_deleted = 0
            AND (
                d.file_name LIKE @searchTerm
                OR d.description LIKE @searchTerm
                OR d.document_type LIKE @searchTerm
                OR ir.reference_number LIKE @searchTerm
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

    /**
     * Updates document metadata.
     * 
     * @async
     * @param {string} id - Document UUID
     * @param {Object} data - Update data
     * @returns {Promise<Object>} Updated document
     */
    async updateMetadata(id, data) {
        const entries = Object.entries(data).filter(([key]) => key !== 'document_id');
        
        if (entries.length === 0) {
            return this.findById(id);
        }

        // Add updated_at
        entries.push(['updated_at', new Date()]);

        const setClause = entries.map(([key]) => `${key} = @${key}`).join(', ');
        const params = entries.map(([key, value]) => ({
            name: key,
            value: value
        }));

        params.push({ name: 'document_id', value: id });

        const query = `
            UPDATE documents
            SET ${setClause}
            WHERE document_id = @document_id
        `;

        await executeQuery(query, params);
        return this.findById(id);
    }

    /**
     * Gets documents by document type.
     * 
     * @async
     * @param {string} documentType - Type of document
     * @param {string} ipRecordId - Optional IP record filter
     * @returns {Promise<Array>} Array of documents
     */
    async findByType(documentType, ipRecordId = null) {
        let query = `
            SELECT 
                document_id,
                file_name,
                document_type,
                file_size,
                uploaded_at,
                is_confidential,
                version_number
            FROM documents
            WHERE document_type = @documentType
            AND is_deleted = 0
        `;

        const params = [
            { name: 'documentType', value: documentType }
        ];

        if (ipRecordId) {
            query += ` AND ip_record_id = @ipRecordId`;
            params.push({ name: 'ipRecordId', type: sql.UniqueIdentifier, value: ipRecordId });
        }

        query += ` ORDER BY uploaded_at DESC`;

        const result = await executeQuery(query, params);
        return result.recordset;
    }
}

module.exports = new DocumentRepository();