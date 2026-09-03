// src/services/document.service.js
/**
 * Document Service
 * ================
 * Business logic layer for document management.
 * Handles document operations including:
 * - Uploading documents (local and SharePoint)
 * - Version management
 * - Document retrieval
 * - SharePoint integration
 * - Document security and access control
 * - Document archiving and deletion
 * 
 * @module services/document.service
 * @requires ../database/repositories/document.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../database/repositories/person.repository
 * @requires ../sharepoint/sharepoint.service
 * @requires ../config/sharepoint
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 * @requires fs
 * @requires path
 */

const documentRepository = require('../database/repositories/document.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const sharepointService = require('../sharepoint/sharepoint.service');
const sharepointConfig = require('../config/sharepoint');
const { ValidationError, NotFoundError, ForbiddenError, InternalServerError } = require('../errors/app-error');
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
     * Supports both local storage and SharePoint integration.
     * 
     * @async
     * @param {Object} file - File object from multer
     * @param {string} ipRecordId - IP record UUID
     * @param {string} uploadedBy - UUID of user uploading
     * @param {Object} metadata - Document metadata
     * @param {string} metadata.documentType - Type of document
     * @param {boolean} [metadata.isConfidential] - Confidentiality flag
     * @param {string} [metadata.description] - Document description
     * @param {boolean} [metadata.useSharePoint] - Use SharePoint storage (default: true if configured)
     * @returns {Promise<Object>} Created document record
     * @throws {ValidationError} If file is invalid or missing required fields
     * @throws {NotFoundError} If IP record not found
     * @throws {InternalServerError} If upload to SharePoint fails
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

            let sharepointResult = null;
            let storagePath = file.path || null;

            // Upload to SharePoint if enabled
            const useSharePoint = metadata.useSharePoint !== false && 
                                  sharepointConfig.clientId && 
                                  sharepointConfig.clientSecret;

            if (useSharePoint) {
                try {
                    sharepointResult = await sharepointService.uploadDocument({
                        entityType: 'ipAssets',
                        entityId: ipRecordId,
                        fileName: file.originalname,
                        fileBuffer: file.buffer || fs.readFileSync(file.path),
                        documentType: metadata.documentType,
                        description: metadata.description || '',
                        metadata: {
                            ipRecordId: ipRecordId,
                            isConfidential: metadata.isConfidential || false,
                            uploadedBy: uploadedBy
                        }
                    });

                    logger.info('Document uploaded to SharePoint', {
                        ipRecordId,
                        fileName: file.originalname,
                        sharepointId: sharepointResult.sharepointId
                    });

                    // If uploaded to SharePoint, we don't need local storage
                    storagePath = null;

                } catch (error) {
                    logger.error('SharePoint upload failed, falling back to local storage:', error);
                    // Fall back to local storage if SharePoint fails
                    // Keep the existing storage path
                }
            }

            // Create document record in database
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
                storage_path: storagePath,
                // SharePoint fields (populated if uploaded to SharePoint)
                sharepoint_id: sharepointResult?.sharepointId || null,
                sharepoint_url: sharepointResult?.sharepointUrl || null,
                sharepoint_folder: sharepointResult?.sharepointFolder || null,
                sharepoint_site_id: sharepointConfig.siteId || null,
                sharepoint_drive_id: sharepointConfig.driveId || null,
                sharepoint_item_id: sharepointResult?.sharepointId || null,
            };

            const document = await documentRepository.create(documentData);

            logger.info('Document uploaded successfully', {
                documentId: document.document_id,
                ipRecordId,
                uploadedBy,
                fileName: file.originalname,
                version: versionNumber,
                storageType: sharepointResult ? 'sharepoint' : 'local'
            });

            return {
                ...document,
                download_url: this.getDocumentDownloadUrl(document, sharepointResult)
            };

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
     * @throws {NotFoundError} If document not found
     * @throws {ForbiddenError} If user doesn't have access
     */
    async getDocument(documentId, userId) {
        const document = await documentRepository.findFullDocument(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check access permissions
        await this.checkDocumentAccess(document, userId);

        // Generate download URL
        const downloadUrl = await this.getDocumentDownloadUrl(document);

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

        // Get user and their roles
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
     * Supports both SharePoint and local file storage.
     * 
     * @param {Object} document - Document object
     * @param {Object} [sharepointResult] - SharePoint upload result (optional)
     * @returns {string|null} Download URL
     */
    getDocumentDownloadUrl(document, sharepointResult = null) {
        // For SharePoint documents
        if (document.sharepoint_id || sharepointResult?.sharepointId) {
            const sharepointId = document.sharepoint_id || sharepointResult.sharepointId;
            return `/api/v1/documents/sharepoint/${sharepointId}/download`;
        }

        // For local file system
        if (document.storage_path) {
            return `/api/v1/documents/${document.document_id}/download`;
        }

        return null;
    }

    /**
     * Gets the actual file content from SharePoint or local storage.
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of requesting user
     * @returns {Promise<Object>} File content and metadata
     * @throws {NotFoundError} If document not found
     * @throws {ForbiddenError} If user doesn't have access
     */
    async getDocumentFile(documentId, userId) {
        const document = await documentRepository.findFullDocument(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check access permissions
        await this.checkDocumentAccess(document, userId);

        // Get file from SharePoint if stored there
        if (document.sharepoint_id) {
            try {
                const result = await sharepointService.downloadDocument(
                    document.sharepoint_id,
                    'ipAssets',
                    document.ip_record_id
                );

                return {
                    content: result.content,
                    metadata: {
                        ...document,
                        ...result.metadata,
                        download_url: document.sharepoint_url
                    }
                };

            } catch (error) {
                logger.error('Error downloading from SharePoint:', error);
                throw new InternalServerError('Failed to download document from SharePoint');
            }
        }

        // Get file from local storage
        if (document.storage_path && fs.existsSync(document.storage_path)) {
            const content = fs.readFileSync(document.storage_path);
            return {
                content,
                metadata: {
                    ...document,
                    download_url: `/api/v1/documents/${documentId}/download`
                }
            };
        }

        throw new NotFoundError('Document file not found', { documentId });
    }

    /**
     * Deletes a document (soft delete) and removes from storage.
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of user deleting
     * @returns {Promise<boolean>} True if successful
     * @throws {NotFoundError} If document not found
     * @throws {ForbiddenError} If user doesn't have permissions
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

        // Delete from SharePoint if stored there
        if (document.sharepoint_id) {
            try {
                await sharepointService.deleteDocument(
                    document.sharepoint_id,
                    'ipAssets',
                    document.ip_record_id
                );
                logger.info('Document deleted from SharePoint', {
                    documentId,
                    sharepointId: document.sharepoint_id
                });
            } catch (error) {
                logger.warn('Could not delete document from SharePoint:', error);
                // Continue with soft delete even if SharePoint deletion fails
            }
        }

        // Delete from local storage if it exists
        if (document.storage_path && fs.existsSync(document.storage_path)) {
            try {
                fs.unlinkSync(document.storage_path);
                logger.info('Document file deleted from storage', {
                    documentId,
                    path: document.storage_path
                });
            } catch (error) {
                logger.warn('Could not delete file from local storage:', {
                    documentId,
                    path: document.storage_path,
                    error: error.message
                });
                // Continue with soft delete even if file deletion fails
            }
        }

        // Archive in database (soft delete)
        await documentRepository.archiveDocument(documentId, userId);

        logger.info('Document deleted (archived)', {
            documentId,
            userId
        });

        return true;
    }

    /**
     * Gets all documents for an IP record.
     * Filters confidential documents based on user permissions.
     * 
     * @async
     * @param {string} ipRecordId - IP record UUID
     * @param {string} userId - UUID of requesting user
     * @returns {Promise<Array>} Array of documents
     * @throws {NotFoundError} If IP record not found
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

        // Add download URLs to documents
        return documents
            .filter(doc => {
                if (!doc.is_confidential) return true;
                return isOwner || hasRole;
            })
            .map(doc => ({
                ...doc,
                download_url: this.getDocumentDownloadUrl(doc)
            }));
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
     * @throws {NotFoundError} If document not found
     * @throws {ForbiddenError} If user doesn't have permissions
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

        // Update SharePoint metadata if document is in SharePoint
        if (document.sharepoint_id) {
            try {
                await sharepointService.updateDocumentMetadata(document.sharepoint_id, {
                    documentType: data.documentType,
                    description: data.description,
                    isConfidential: data.isConfidential
                });
            } catch (error) {
                logger.warn('Failed to update SharePoint metadata:', error);
                // Continue with database update even if SharePoint update fails
            }
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

        return {
            ...updated,
            download_url: this.getDocumentDownloadUrl(updated)
        };
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
     * @throws {NotFoundError} If original document not found
     */
    async createNewVersion(documentId, file, userId, versionComment = null) {
        const originalDoc = await documentRepository.findById(documentId);
        
        if (!originalDoc) {
            throw new NotFoundError('Original document not found', { documentId });
        }

        let sharepointResult = null;
        let storagePath = file.path || null;

        // Upload to SharePoint if original document is in SharePoint
        if (originalDoc.sharepoint_id) {
            try {
                sharepointResult = await sharepointService.uploadDocument({
                    entityType: 'ipAssets',
                    entityId: originalDoc.ip_record_id,
                    fileName: file.originalname,
                    fileBuffer: file.buffer || fs.readFileSync(file.path),
                    documentType: originalDoc.document_type,
                    description: originalDoc.description || '',
                    metadata: {
                        ipRecordId: originalDoc.ip_record_id,
                        isConfidential: originalDoc.is_confidential,
                        uploadedBy: userId,
                        versionNumber: (originalDoc.version_number || 0) + 1,
                        versionComment: versionComment
                    }
                });
                storagePath = null; // Don't keep local copy
            } catch (error) {
                logger.error('SharePoint version upload failed:', error);
                // Fall back to local storage
            }
        }

        // Create new version in database
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
            storage_path: storagePath,
            version_comment: versionComment || null,
            sharepoint_id: sharepointResult?.sharepointId || null,
            sharepoint_url: sharepointResult?.sharepointUrl || null,
            sharepoint_folder: sharepointResult?.sharepointFolder || null,
            sharepoint_site_id: sharepointConfig.siteId || null,
            sharepoint_drive_id: sharepointConfig.driveId || null,
            sharepoint_item_id: sharepointResult?.sharepointId || null,
        };

        const newVersion = await documentRepository.create(newVersionData);

        logger.info('Document version created', {
            originalDocumentId: documentId,
            newDocumentId: newVersion.document_id,
            versionNumber: newVersion.version_number,
            userId,
            storageType: sharepointResult ? 'sharepoint' : 'local'
        });

        return {
            ...newVersion,
            download_url: this.getDocumentDownloadUrl(newVersion, sharepointResult)
        };
    }

    /**
     * Gets document version history.
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of requesting user
     * @returns {Promise<Array>} Array of document versions with download URLs
     * @throws {NotFoundError} If document not found
     * @throws {ForbiddenError} If user doesn't have access
     */
    async getVersionHistory(documentId, userId) {
        const document = await documentRepository.findById(documentId);
        
        if (!document) {
            throw new NotFoundError('Document not found', { documentId });
        }

        // Check access
        await this.checkDocumentAccess(document, userId);

        const versions = await documentRepository.getVersionHistory(
            document.ip_record_id, 
            document.document_type
        );

        // Add download URLs to versions
        return versions.map(version => ({
            ...version,
            download_url: `/api/v1/documents/${version.document_id}/download`
        }));
    }

    /**
     * Searches for documents by filename or description.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @param {string} userId - UUID of requesting user
     * @param {number} [limit] - Maximum results
     * @returns {Promise<Array>} Array of matching documents
     */
    async searchDocuments(searchQuery, userId, limit = 20) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const results = await documentRepository.search(searchQuery, limit);

        // Filter results based on user permissions
        const userRoles = await personRepository.getUserRoles(userId);
        const hasPrivilegedRole = userRoles.some(r => 
            ['TTO Officer', 'Admin', 'Legal Officer', 'Executive'].includes(r.role_name)
        );

        // Check each document's access permissions
        const filteredResults = [];
        for (const doc of results) {
            try {
                await this.checkDocumentAccess(doc, userId);
                filteredResults.push({
                    ...doc,
                    download_url: this.getDocumentDownloadUrl(doc)
                });
            } catch (error) {
                // Skip documents user doesn't have access to
                logger.debug('Skipping document due to access restrictions', {
                    documentId: doc.document_id,
                    userId
                });
            }
        }

        return filteredResults;
    }

    /**
     * Uploads a document directly to SharePoint.
     * 
     * @async
     * @param {Object} options - Upload options
     * @param {string} options.ipRecordId - IP record UUID
     * @param {string} options.fileName - File name
     * @param {Buffer} options.fileBuffer - File content
     * @param {string} options.documentType - Document type
     * @param {string} options.description - Document description
     * @param {string} options.uploadedBy - User UUID
     * @param {Object} [options.metadata] - Additional metadata
     * @returns {Promise<Object>} SharePoint upload result
     * @throws {InternalServerError} If upload fails
     */
    async uploadToSharePoint(options) {
        try {
            const {
                ipRecordId,
                fileName,
                fileBuffer,
                documentType,
                description,
                uploadedBy,
                metadata = {}
            } = options;

            const result = await sharepointService.uploadDocument({
                entityType: 'ipAssets',
                entityId: ipRecordId,
                fileName,
                fileBuffer,
                documentType,
                description,
                metadata: {
                    ...metadata,
                    ipRecordId,
                    uploadedBy
                }
            });

            logger.info('Document uploaded directly to SharePoint', {
                ipRecordId,
                fileName,
                sharepointId: result.sharepointId
            });

            // Create database record
            const documentData = {
                document_id: uuidv4(),
                ip_record_id: ipRecordId,
                file_name: fileName,
                file_size: fileBuffer.length,
                file_extension: path.extname(fileName).substring(1),
                document_type: documentType || 'GENERAL',
                is_confidential: metadata.isConfidential || false,
                description: description || null,
                version_number: 1,
                uploaded_by: uploadedBy,
                storage_path: null,
                sharepoint_id: result.sharepointId,
                sharepoint_url: result.sharepointUrl,
                sharepoint_folder: result.sharepointFolder,
                sharepoint_site_id: sharepointConfig.siteId || null,
                sharepoint_drive_id: sharepointConfig.driveId || null,
                sharepoint_item_id: result.sharepointId,
            };

            const document = await documentRepository.create(documentData);

            return {
                ...document,
                ...result,
                download_url: result.sharepointUrl
            };

        } catch (error) {
            logger.error('Failed to upload directly to SharePoint:', error);
            throw new InternalServerError('Failed to upload document to SharePoint');
        }
    }

    /**
     * Archives a document (soft delete with archiving flag).
     * 
     * @async
     * @param {string} documentId - Document UUID
     * @param {string} userId - UUID of user archiving
     * @returns {Promise<Object>} Archived document
     * @throws {NotFoundError} If document not found
     * @throws {ForbiddenError} If user doesn't have permissions
     */
    async archiveDocument(documentId, userId) {
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
            throw new ForbiddenError('Access denied: Cannot archive this document', {
                documentId,
                userId
            });
        }

        const archived = await documentRepository.archiveDocument(documentId, userId);

        logger.info('Document archived', {
            documentId,
            userId
        });

        return {
            ...archived,
            download_url: this.getDocumentDownloadUrl(archived)
        };
    }
}

module.exports = new DocumentService();