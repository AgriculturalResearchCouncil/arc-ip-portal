/**
 * Document Service
 * ================
 * Business logic layer for document management.
 * Handles document operations including:
 * - Uploading documents
 * - Version management
 * - Document retrieval
 * - SharePoint integration
 * - Document security and access control
 * 
 * @module services/document.service
 * @requires ../database/repositories/document.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 * @requires fs
 * @requires path
 */

const documentRepository = require('../database/repositories/document.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

/**
 * DocumentService class containing all document business logic.
 * 
 * @class DocumentService
 */
class DocumentService {
    /**
     * Uploads a document and associates it with an IP record.
     * 
     * @async
     * @param {Object} file - File object from multer
     * @param {string} ipRecordId - IP record UUID
     * @param {string} uploadedBy - UUID of user uploading
     * @param {Object} metadata - Document metadata
     * @param {string} metadata.documentType - Type of document
     * @param {boolean} [metadata.isConfidential] - Confidentiality flag
     * @param {string} [metadata.description] - Document description
     * @returns {Promise<Object>} Created document record
     * @throws {ValidationError} If file is invalid or missing required fields
     * @throws {NotFoundError} If IP record not found
     */
    async uploadDocument(file, ipRecordId, uploadedBy, metadata) {
        try {
            // Validate file
            if (!file) {
                throw new ValidationError('No file provided', {
                    message: 'A file is required for upload'
                });
            }

            // Validate IP record exists
            const ipRecord = await ipRecordRepository.findById(ipRecordId);
            if (!ipRecord) {
                throw new NotFoundError('IP record not found', { ipRecordId });
            }

            // Validate document type
            if (!metadata.documentType) {
                throw new ValidationError('Document type is required', {
                    required: ['documentType']
                });
            }

            // Get current version number
            const existingDocs = await documentRepository.findByIpRecord(ipRecordId);
            const versionNumber = existingDocs.length > 0 
                ? Math.max(...existingDocs.map(d => d.version_number || 0)) + 1 
                : 1;

            // Create document record
            const documentData = {
                document_id: uuidv4(),
                ip_record_id: ipRecordId,
                file_name: file.originalname,
                file_size: file.size,
                file_extension: path.extname(file.originalname).substring(1),
                document_type: metadata.documentType,
                is_confidential: metadata.isConfidential || false,
                description: metadata.description || null,
                version_number: versionNumber,
                uploaded_by: uploadedBy,
                storage_path: file.path || null,
            };

            const document = await documentRepository.create(documentData);

            logger.info('Document uploaded', {
                documentId: document.document_id,
                ipRecordId,
                uploadedBy,
                fileName: file.originalname,
                version: versionNumber
            });

            return document;
        } catch (error) {
            logger.error('Error uploading document:', error);
            throw error;
        }
    }

    /**
     * Gets a document by ID with download URL.
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of requesting user
     * @returns {Promise<Object>} Document object with download URL
     */
    async getDocument(documentId, userId) {
        const document = await documentRepository.findFullDocument(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check access permissions
        await this.checkDocumentAccess(document, userId);

        // Generate download URL (if stored in SharePoint or file system)
        const downloadUrl = await this.getDownloadUrl(document);

        return {
            ...document,
            download_url: downloadUrl
        };
    }

    /**
     * Checks if a user has access to a document.
     * 
     * @async
     * @param {Object} document - Document object
     * @param {string} userId - UUID of requesting user
     * @throws {ForbiddenError} If user doesn't have access
     */
    async checkDocumentAccess(document, userId) {
        // Check if document is confidential
        if (!document.is_confidential) {
            return true; // Public documents are accessible
        }

        // Get IP record owner
        const ipRecord = await ipRecordRepository.findById(document.ip_record_id);
        if (!ipRecord) {
            throw new NotFoundError('IP record not found', { ipRecordId: document.ip_record_id });
        }

        // Allow access if user is:
        // 1. The owner of the IP record
        // 2. A TTO Officer
        // 3. An Admin
        // 4. A Legal Officer
        // 5. An Executive
        const user = await personRepository.findById(userId);
        if (!user) {
            throw new ForbiddenError('User not found');
        }

        const isOwner = ipRecord.owner_id === userId;
        const userRoles = await personRepository.getUserRoles(userId);
        const hasRole = userRoles.some(r => 
            ['TTO Officer', 'Admin', 'Legal Officer', 'Executive'].includes(r.role_name)
        );

        if (!isOwner && !hasRole) {
            throw new ForbiddenError('Access denied: Document is confidential', {
                documentId: document.document_id,
                userId
            });
        }

        return true;
    }

    /**
     * Gets a download URL for a document.
     * 
     * @async
     * @param {Object} document - Document object
     * @returns {Promise<string>} Download URL
     */
    async getDownloadUrl(document) {
        // For SharePoint documents
        if (document.sharepoint_id) {
            // Return SharePoint download URL
            return `https://graph.microsoft.com/v1.0/drives/items/${document.sharepoint_id}/content`;
        }

        // For local file system
        if (document.storage_path) {
            return `/api/v1/documents/${document.document_id}/download`;
        }

        return null;
    }

    /**
     * Deletes a document (soft delete).
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of user deleting
     * @returns {Promise<boolean>} True if successful
     */
    async deleteDocument(documentId, userId) {
        const document = await documentRepository.findById(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check permissions
        const ipRecord = await ipRecordRepository.findById(document.ip_record_id);
        const userRoles = await personRepository.getUserRoles(userId);
        const isAdmin = userRoles.some(r => r.role_name === 'Admin');
        const isOwner = ipRecord.owner_id === userId;

        if (!isAdmin && !isOwner) {
            throw new ForbiddenError('Access denied: Cannot delete this document', {
                documentId,
                userId
            });
        }

        // Delete file from storage
        if (document.storage_path) {
            try {
                fs.unlinkSync(document.storage_path);
            } catch (error) {
                logger.warn('Could not delete file from storage', {
                    documentId,
                    path: document.storage_path,
                    error: error.message
                });
            }
        }

        await documentRepository.softDelete(documentId);

        logger.info('Document deleted', {
            documentId,
            userId
        });

        return true;
    }

    /**
     * Gets all documents for an IP record.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} userId - UUID of requesting user
     * @returns {Promise<Array>} Array of documents
     */
    async getDocumentsByIpRecord(ipRecordId, userId) {
        // Verify IP record exists
        const ipRecord = await ipRecordRepository.findById(ipRecordId);
        if (!ipRecord) {
            throw new NotFoundError('IP record not found', { ipRecordId });
        }

        const documents = await documentRepository.findByIpRecord(ipRecordId);
        
        // Filter confidential documents based on permissions
        const userRoles = await personRepository.getUserRoles(userId);
        const hasRole = userRoles.some(r => 
            ['TTO Officer', 'Admin', 'Legal Officer', 'Executive'].includes(r.role_name)
        );
        const isOwner = ipRecord.owner_id === userId;

        return documents.filter(doc => {
            if (!doc.is_confidential) return true;
            return isOwner || hasRole;
        });
    }

    /**
     * Updates document metadata.
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {Object} data - Update data
     * @param {string} [data.documentType] - Document type
     * @param {boolean} [data.isConfidential] - Confidentiality flag
     * @param {string} [data.description] - Document description
     * @param {string} userId - UUID of user making the change
     * @returns {Promise<Object>} Updated document
     */
    async updateDocumentMetadata(documentId, data, userId) {
        const document = await documentRepository.findById(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check permissions
        const ipRecord = await ipRecordRepository.findById(document.ip_record_id);
        const userRoles = await personRepository.getUserRoles(userId);
        const isAdmin = userRoles.some(r => r.role_name === 'Admin');
        const isOwner = ipRecord.owner_id === userId;

        if (!isAdmin && !isOwner) {
            throw new ForbiddenError('Access denied: Cannot update this document', {
                documentId,
                userId
            });
        }

        const updated = await documentRepository.update(documentId, {
            document_type: data.documentType,
            is_confidential: data.isConfidential,
            description: data.description,
            updated_at: new Date()
        });

        logger.info('Document metadata updated', {
            documentId,
            userId
        });

        return updated;
    }

    /**
     * Creates a new version of a document.
     * 
     * @async
     * @param {string} documentId - Original document UUID
     * @param {Object} file - New file from multer
     * @param {string} userId - UUID of user uploading
     * @param {string} [versionComment] - Comment about the new version
     * @returns {Promise<Object>} New document version
     */
    async createNewVersion(documentId, file, userId, versionComment = null) {
        const originalDoc = await documentRepository.findById(documentId);
        
        if (!originalDoc) {
            throw new NotFoundError('Original document not found', { documentId });
        }

        // Create new version
        const newVersionData = {
            document_id: uuidv4(),
            ip_record_id: originalDoc.ip_record_id,
            file_name: file.originalname,
            file_size: file.size,
            file_extension: path.extname(file.originalname).substring(1),
            document_type: originalDoc.document_type,
            is_confidential: originalDoc.is_confidential,
            description: originalDoc.description,
            version_number: (originalDoc.version_number || 0) + 1,
            uploaded_by: userId,
            storage_path: file.path || null,
            version_comment: versionComment || null,
        };

        const newVersion = await documentRepository.create(newVersionData);

        logger.info('Document version created', {
            originalDocumentId: documentId,
            newDocumentId: newVersion.document_id,
            versionNumber: newVersion.version_number,
            userId
        });

        return newVersion;
    }

    /**
     * Gets document version history.
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of requesting user
     * @returns {Promise<Array>} Array of document versions
     */
    async getVersionHistory(documentId, userId) {
        const document = await documentRepository.findById(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check access
        await this.checkDocumentAccess(document, userId);

        return await documentRepository.getVersionHistory(document.ip_record_id, document.document_type);
    }
}

module.exports = new DocumentService();