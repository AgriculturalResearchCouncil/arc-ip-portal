// src/sharepoint/sharepoint.service.js
/**
 * SharePoint Service Module
 * =========================
 * Orchestrates SharePoint document operations with the Portal backend.
 * 
 * This module provides:
 * - Entity-based folder management
 * - Document upload with metadata
 * - Document download and retrieval
 * - Document deletion and archiving
 * - File validation and security checks
 * - Integration with database for metadata tracking
 * 
 * @module sharepoint/sharepoint.service
 * @requires ./sharepoint.client
 * @requires ../config/sharepoint
 * @requires ../logging/logger
 * @requires ../errors/app-error
 */

const sharepointClient = require('./sharepoint.client');
const config = require('../config/sharepoint');
const logger = require('../logging/logger');
const { InternalServerError, BadRequestError } = require('../errors/app-error');

/**
 * SharePointService Class
 * 
 * Orchestrates all SharePoint operations with proper error handling,
 * logging, and business logic enforcement.
 * 
 * @class SharePointService
 */
class SharePointService {
    /**
     * Get or Create Entity Folder
     * 
     * Retrieves or creates a SharePoint folder for a specific entity type.
     * 
     * @async
     * @param {string} entityType - Entity type (ipAssets, disclosures, etc.)
     * @param {string} entityId - Entity record ID
     * @returns {Promise<string>} SharePoint folder path
     * @throws {BadRequestError} If entity type is unknown
     * @throws {InternalServerError} If folder operation fails
     */
    async getOrCreateFolder(entityType, entityId) {
        try {
            // Get folder structure from configuration
            const folderConfig = config.folderStructure[entityType];
            if (!folderConfig) {
                throw new BadRequestError(`Unknown entity type: ${entityType}`);
            }

            // Handle both string and object formats for folderStructure
            let folderPath;
            if (typeof folderConfig === 'object' && folderConfig.path) {
                // New format: { library: 'ipDocs', path: 'IPAssets/{ipRecordId}' }
                folderPath = folderConfig.path.replace(/{[^}]+}/g, entityId);
            } else if (typeof folderConfig === 'string') {
                // Legacy format: 'IPAssets/{ipRecordId}'
                folderPath = folderConfig.replace(/{[^}]+}/g, entityId);
            } else {
                throw new Error(`Invalid folder configuration for entity type: ${entityType}`);
            }

            const pathSegments = folderPath.split('/');

            // Check if folder already exists
            try {
                // Use the first segment as the parent folder (e.g., "IPAssets")
                const parentPath = pathSegments[0];
                const folderName = pathSegments[1] || entityId;
                
                const files = await sharepointClient.listFiles(parentPath);
                const folderExists = files.some(f => f.name === folderName && f.isFolder);

                if (folderExists) {
                    logger.debug('Folder already exists', { entityType, entityId, folderPath });
                    return folderPath;
                }
            } catch (error) {
                // Folder doesn't exist or parent doesn't exist, will create it
                logger.debug('Folder does not exist, creating new folder', { 
                    entityType, 
                    entityId, 
                    folderPath 
                });
            }

            // Create new folder
            // Create parent folder first if it doesn't exist, then create the child
            const parentPath = pathSegments[0];
            const folderName = pathSegments[1] || entityId;
            
            // Ensure the parent folder exists
            try {
                const parentFiles = await sharepointClient.listFiles('');
                const parentExists = parentFiles.some(f => f.name === parentPath && f.isFolder);
                
                if (!parentExists) {
                    // Create the parent folder (e.g., "IPAssets")
                    await sharepointClient.createFolder('', parentPath);
                    logger.info('Created parent folder', { parentPath });
                }
            } catch (error) {
                // Parent might already exist, continue
                logger.debug('Parent folder may already exist', { parentPath });
            }

            // Create the child folder
            const folder = await sharepointClient.createFolder(parentPath, folderName);
            
            logger.info('SharePoint folder created', { 
                entityType, 
                entityId, 
                folderPath 
            });

            return folderPath;

        } catch (error) {
            logger.error('Failed to get/create SharePoint folder:', error);
            throw new InternalServerError('Failed to get/create SharePoint folder');
        }
    }

    /**
     * Upload Document
     * 
     * Handles the complete document upload process including:
     * 1. File validation (size, type)
     * 2. Folder creation/retrieval
     * 3. File upload to SharePoint
     * 4. Metadata association
     * 
     * @async
     * @param {Object} options - Upload options
     * @param {string} options.entityType - Entity type (ipAssets, disclosures, etc.)
     * @param {string} options.entityId - Entity record ID
     * @param {string} options.fileName - File name
     * @param {Buffer} options.fileBuffer - File content
     * @param {string} [options.documentType] - Document type category
     * @param {string} [options.description] - Document description
     * @param {Object} [options.metadata] - Additional metadata
     * @returns {Promise<Object>} Uploaded document information
     * @throws {BadRequestError} If file validation fails
     * @throws {InternalServerError} If upload fails
     */
    async uploadDocument(options) {
        try {
            const {
                entityType,
                entityId,
                fileName,
                fileBuffer,
                documentType,
                description,
                metadata = {}
            } = options;

            // Validate file before upload
            this.validateFile(fileBuffer, fileName);

            // Get or create folder for the entity
            const folderPath = await this.getOrCreateFolder(entityType, entityId);

            // Prepare SharePoint metadata
            const sharepointMetadata = {
                documentType: documentType || 'GENERAL',
                description: description || '',
                [entityType + 'Id']: entityId, // Dynamic property based on entity type
                ...metadata
            };

            // Upload file to SharePoint
            const uploadResult = await sharepointClient.uploadFile(
                folderPath,
                fileName,
                fileBuffer,
                sharepointMetadata
            );

            logger.info('Document uploaded to SharePoint', {
                entityType,
                entityId,
                fileName,
                sharepointId: uploadResult.id,
                library: config.documentLibrary || 'TTOPortalDocuments'
            });

            return {
                sharepointId: uploadResult.id,
                sharepointUrl: uploadResult.webUrl,
                sharepointFolder: folderPath,
                fileName: uploadResult.name,
                fileSize: uploadResult.size,
                fileUrl: uploadResult.downloadUrl || uploadResult.webUrl,
                metadata: sharepointMetadata
            };

        } catch (error) {
            logger.error('Failed to upload document to SharePoint:', error);
            throw error;
        }
    }

    /**
     * Download Document
     * 
     * Retrieves both the file content and metadata from SharePoint.
     * 
     * @async
     * @param {string} sharepointId - SharePoint file ID
     * @param {string} entityType - Entity type (for logging)
     * @param {string} entityId - Entity ID (for logging)
     * @returns {Promise<Object>} Document content and metadata
     * @throws {InternalServerError} If download fails
     */
    async downloadDocument(sharepointId, entityType, entityId) {
        try {
            // Get file metadata
            const metadata = await sharepointClient.getFileMetadata(sharepointId);
            
            // Download file content
            const content = await sharepointClient.downloadFile(sharepointId);

            logger.info('Document downloaded from SharePoint', {
                entityType,
                entityId,
                sharepointId,
                fileName: metadata.name,
                library: config.documentLibrary || 'TTOPortalDocuments'
            });

            return {
                content,
                metadata: {
                    id: metadata.id,
                    name: metadata.name,
                    size: metadata.size,
                    webUrl: metadata.webUrl,
                    createdDateTime: metadata.createdDateTime,
                    lastModifiedDateTime: metadata.lastModifiedDateTime,
                    createdBy: metadata.createdBy,
                    lastModifiedBy: metadata.lastModifiedBy
                }
            };

        } catch (error) {
            logger.error('Failed to download document from SharePoint:', error);
            throw new InternalServerError('Failed to download document from SharePoint');
        }
    }

    /**
     * Delete Document
     * 
     * Permanently deletes a document from SharePoint.
     * 
     * @async
     * @param {string} sharepointId - SharePoint file ID
     * @param {string} entityType - Entity type (for logging)
     * @param {string} entityId - Entity ID (for logging)
     * @returns {Promise<boolean>} True if deletion was successful
     * @throws {InternalServerError} If deletion fails
     */
    async deleteDocument(sharepointId, entityType, entityId) {
        try {
            await sharepointClient.deleteFile(sharepointId);

            logger.info('Document deleted from SharePoint', {
                entityType,
                entityId,
                sharepointId,
                library: config.documentLibrary || 'TTOPortalDocuments'
            });

            return true;

        } catch (error) {
            logger.error('Failed to delete document from SharePoint:', error);
            throw new InternalServerError('Failed to delete document from SharePoint');
        }
    }

    /**
     * List Documents for Entity
     * 
     * Retrieves a list of all documents associated with a specific entity.
     * 
     * @async
     * @param {string} entityType - Entity type
     * @param {string} entityId - Entity record ID
     * @param {number} limit - Maximum results (default: 100)
     * @returns {Promise<Array>} List of documents
     * @throws {BadRequestError} If entity type is unknown
     * @throws {InternalServerError} If listing fails
     */
    async listDocuments(entityType, entityId, limit = 100) {
        try {
            // Get folder structure from configuration
            const folderConfig = config.folderStructure[entityType];
            if (!folderConfig) {
                throw new BadRequestError(`Unknown entity type: ${entityType}`);
            }

            // Handle both string and object formats
            let folderPath;
            if (typeof folderConfig === 'object' && folderConfig.path) {
                folderPath = folderConfig.path.replace(/{[^}]+}/g, entityId);
            } else if (typeof folderConfig === 'string') {
                folderPath = folderConfig.replace(/{[^}]+}/g, entityId);
            } else {
                throw new Error(`Invalid folder configuration for entity type: ${entityType}`);
            }

            // List files from SharePoint
            const files = await sharepointClient.listFiles(folderPath, limit);

            // Filter out folders and return file information
            return files.filter(f => !f.isFolder).map(file => ({
                id: file.id,
                name: file.name,
                size: file.size,
                webUrl: file.webUrl,
                createdDateTime: file.createdDateTime,
                lastModifiedDateTime: file.lastModifiedDateTime
            }));

        } catch (error) {
            logger.error('Failed to list documents from SharePoint:', error);
            throw new InternalServerError('Failed to list documents from SharePoint');
        }
    }

    /**
     * Validate File
     * 
     * Validates file before upload to ensure it meets security and
     * performance requirements.
     * 
     * @param {Buffer} fileBuffer - File content
     * @param {string} fileName - File name
     * @throws {BadRequestError} If validation fails
     */
    validateFile(fileBuffer, fileName) {
        // Validate file size
        const maxSize = config.fileSizeLimits.maxFileSize * 1024 * 1024;
        if (fileBuffer.length > maxSize) {
            throw new BadRequestError(
                `File size exceeds maximum allowed size of ${config.fileSizeLimits.maxFileSize}MB`
            );
        }

        // Validate file type
        const allowedTypes = config.fileSizeLimits.allowedMimeTypes || [];
        const extension = fileName.split('.').pop().toLowerCase();
        
        const mimeTypes = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            xls: 'application/vnd.ms-excel',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            tiff: 'image/tiff',
            txt: 'text/plain'
        };

        const mimeType = mimeTypes[extension];
        if (mimeType && !allowedTypes.includes(mimeType)) {
            throw new BadRequestError(`File type .${extension} is not allowed`);
        }
    }

    /**
     * Get Document Download URL
     * 
     * Retrieves the direct download URL for a document from SharePoint.
     * 
     * @async
     * @param {string} sharepointId - SharePoint file ID
     * @returns {Promise<string>} Download URL
     * @throws {InternalServerError} If URL retrieval fails
     */
    async getDownloadUrl(sharepointId) {
        try {
            const metadata = await sharepointClient.getFileMetadata(sharepointId);
            return metadata.webUrl;
        } catch (error) {
            logger.error('Failed to get download URL from SharePoint:', error);
            throw new InternalServerError('Failed to get download URL from SharePoint');
        }
    }

    /**
     * Update Document Metadata
     * 
     * Updates custom metadata for a document in SharePoint.
     * 
     * @async
     * @param {string} sharepointId - SharePoint file ID
     * @param {Object} metadata - Metadata to update
     * @returns {Promise<Object>} Updated metadata
     * @throws {InternalServerError} If update fails
     */
    async updateDocumentMetadata(sharepointId, metadata) {
        try {
            const result = await sharepointClient.updateFileMetadata(sharepointId, metadata);
            logger.info('Document metadata updated in SharePoint', { 
                sharepointId, 
                metadata 
            });
            return result;
        } catch (error) {
            logger.error('Failed to update document metadata in SharePoint:', error);
            throw new InternalServerError('Failed to update document metadata in SharePoint');
        }
    }
}

module.exports = new SharePointService();