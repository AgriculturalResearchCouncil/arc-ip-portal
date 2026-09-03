// src/sharepoint/sharepoint.client.js
/**
 * SharePoint Client Module
 * ========================
 * Handles direct communication with SharePoint via Microsoft Graph API.
 * 
 * This module provides:
 * - Authentication with Microsoft Graph using OAuth2 Client Credentials
 * - File upload/download operations
 * - Folder creation and management
 * - Metadata management
 * - Retry logic with exponential backoff
 * - Error handling and logging
 * 
 * @module sharepoint/sharepoint.client
 * @requires axios
 * @requires @azure/identity
 * @requires @microsoft/microsoft-graph-client
 * @requires ../config/sharepoint
 * @requires ../logging/logger
 * @requires ../errors/app-error
 */

const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const config = require('../config/sharepoint');
const logger = require('../logging/logger');
const { ServiceUnavailableError, InternalServerError } = require('../errors/app-error');

/**
 * SharePointClient Class
 * 
 * Manages all SharePoint document operations through Microsoft Graph API.
 * Implements token caching, retry logic, and comprehensive error handling.
 * 
 * @class SharePointClient
 */
class SharePointClient {
    /**
     * Constructor - Initializes SharePoint client with configuration
     */
    constructor() {
        /** @property {string} baseUrl - Microsoft Graph API base URL */
        this.baseUrl = config.baseUrl;
        
        /** @property {string} siteId - SharePoint site ID */
        this.siteId = config.siteId;
        
        /** @property {string} driveId - SharePoint document library drive ID (TTOPortalDocuments) */
        this.driveId = config.driveId;
        
        /** @property {string} clientId - SharePoint app client ID */
        this.clientId = config.clientId;
        
        /** @property {string} clientSecret - SharePoint app client secret */
        this.clientSecret = config.clientSecret;
        
        /** @property {string} tenantId - Azure AD tenant ID */
        this.tenantId = config.tenantId;
        
        /** @property {Client} graphClient - Cached Microsoft Graph client instance */
        this.graphClient = null;
        
        /** @property {string} accessToken - Cached access token */
        this.accessToken = null;
        
        /** @property {number} tokenExpiry - Token expiration timestamp */
        this.tokenExpiry = null;
    }

    /**
     * Initialize Graph Client
     * 
     * Creates and authenticates a Microsoft Graph client using the
     * Client Credentials OAuth2 flow. Implements token caching to
     * avoid unnecessary authentication requests.
     * 
     * @async
     * @returns {Promise<Client>} Authenticated Microsoft Graph client
     * @throws {ServiceUnavailableError} If authentication fails
     */
    async initializeClient() {
        // Return cached client if token is still valid
        if (this.graphClient && this.accessToken && this.tokenExpiry > Date.now()) {
            return this.graphClient;
        }

        try {
            // Create credential using Client Secret
            const credential = new ClientSecretCredential(
                this.tenantId,
                this.clientId,
                this.clientSecret
            );

            // Set up authentication provider
            const authProvider = new TokenCredentialAuthenticationProvider(credential, {
                scopes: ['https://graph.microsoft.com/.default']
            });

            // Initialize Graph client with middleware
            this.graphClient = Client.initWithMiddleware({
                authProvider: authProvider,
                fetchOptions: {
                    timeout: 30000 // 30 second timeout
                }
            });

            // Cache token for reuse
            const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
            this.accessToken = tokenResponse.token;
            this.tokenExpiry = tokenResponse.expiresOnTimestamp;

            logger.info('SharePoint Graph client initialized successfully');
            return this.graphClient;

        } catch (error) {
            logger.error('Failed to initialize SharePoint client:', error);
            throw new ServiceUnavailableError('SharePoint service is currently unavailable');
        }
    }

    /**
     * Get Graph Client with Retry
     * 
     * Retrieves the Graph client with automatic retry logic for
     * transient failures. Implements exponential backoff.
     * 
     * @async
     * @param {number} retryCount - Current retry attempt (default: 0)
     * @returns {Promise<Client>} Authenticated Graph client
     * @throws {Error} If all retry attempts fail
     */
    async getClient(retryCount = 0) {
        try {
            return await this.initializeClient();
        } catch (error) {
            const maxRetries = config.retry.maxRetries || 3;
            if (retryCount < maxRetries) {
                const delay = this.getRetryDelay(retryCount);
                logger.warn(`Retrying SharePoint connection, attempt ${retryCount + 1}/${maxRetries}`);
                await this.delay(delay);
                return this.getClient(retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * Calculate Retry Delay
     * 
     * Implements exponential backoff for retry attempts to avoid
     * overwhelming the SharePoint API during failure scenarios.
     * 
     * @param {number} retryCount - Current retry attempt
     * @returns {number} Delay in milliseconds
     */
    getRetryDelay(retryCount) {
        const baseDelay = config.retry.initialDelay || 1000;
        const maxDelay = config.retry.maxDelay || 10000;
        const backoffFactor = config.retry.backoffFactor || 2;
        
        const delay = baseDelay * Math.pow(backoffFactor, retryCount);
        return Math.min(delay, maxDelay);
    }

    /**
     * Delay Execution
     * 
     * Utility function to pause execution for a specified duration.
     * Used in retry logic to implement exponential backoff.
     * 
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Upload File to SharePoint
     * 
     * Uploads a file to SharePoint with optional metadata.
     * Uses Microsoft Graph API's content upload endpoint.
     * 
     * @async
     * @param {string} folderPath - SharePoint folder path (relative to the library root)
     * @param {string} fileName - File name
     * @param {Buffer} fileBuffer - File content as buffer
     * @param {Object} metadata - Optional file metadata
     * @returns {Promise<Object>} Uploaded file information
     * @throws {InternalServerError} If upload fails
     * 
     * @example
     * // Upload to TTOPortalDocuments/IPAssets/123/test.txt
     * await client.uploadFile('IPAssets/123', 'test.txt', buffer, { documentType: 'Test' });
     */
    async uploadFile(folderPath, fileName, fileBuffer, metadata = {}) {
        try {
            const client = await this.getClient();
            const driveId = this.driveId;

            // The folderPath is relative to the library root (TTOPortalDocuments)
            const uploadPath = folderPath ? `${folderPath}/${fileName}` : fileName;
            const uploadUrl = `/drives/${driveId}/root:/${uploadPath}:/content`;

            logger.info('Uploading file to SharePoint', { 
                folderPath, 
                fileName, 
                size: fileBuffer.length,
                library: 'TTOPortalDocuments'
            });

            const response = await client.api(uploadUrl)
                .header('Content-Type', 'application/octet-stream')
                .put(fileBuffer);

            // Update metadata if provided
            if (metadata && Object.keys(metadata).length > 0) {
                await this.updateFileMetadata(response.id, metadata);
            }

            return {
                id: response.id,
                webUrl: response.webUrl,
                name: response.name,
                size: response.size,
                lastModifiedDateTime: response.lastModifiedDateTime,
                createdDateTime: response.createdDateTime,
                downloadUrl: response['@microsoft.graph.downloadUrl'] || null
            };

        } catch (error) {
            logger.error('Failed to upload file to SharePoint:', error);
            throw new InternalServerError('Failed to upload file to SharePoint');
        }
    }

    /**
     * Download File from SharePoint
     * 
     * Downloads a file from SharePoint using its unique ID.
     * Returns file content as a Buffer for processing.
     * 
     * @async
     * @param {string} fileId - SharePoint file ID
     * @returns {Promise<Buffer>} File content as buffer
     * @throws {InternalServerError} If download fails
     */
    async downloadFile(fileId) {
        try {
            const client = await this.getClient();
            const downloadUrl = `/drives/${this.driveId}/items/${fileId}/content`;

            logger.info('Downloading file from SharePoint', { fileId });

            const response = await client.api(downloadUrl)
                .responseType('arraybuffer')
                .get();

            return Buffer.from(response);

        } catch (error) {
            logger.error('Failed to download file from SharePoint:', error);
            throw new InternalServerError('Failed to download file from SharePoint');
        }
    }

    /**
     * Get File Metadata
     * 
     * Retrieves comprehensive metadata for a file from SharePoint.
     * 
     * @async
     * @param {string} fileId - SharePoint file ID
     * @returns {Promise<Object>} File metadata
     * @throws {InternalServerError} If metadata retrieval fails
     */
    async getFileMetadata(fileId) {
        try {
            const client = await this.getClient();
            const metadataUrl = `/drives/${this.driveId}/items/${fileId}`;

            const response = await client.api(metadataUrl)
                .select('id,name,size,webUrl,createdDateTime,lastModifiedDateTime,createdBy,lastModifiedBy')
                .get();

            return {
                id: response.id,
                name: response.name,
                size: response.size,
                webUrl: response.webUrl,
                createdDateTime: response.createdDateTime,
                lastModifiedDateTime: response.lastModifiedDateTime,
                createdBy: response.createdBy?.user?.displayName || null,
                lastModifiedBy: response.lastModifiedBy?.user?.displayName || null
            };

        } catch (error) {
            logger.error('Failed to get file metadata from SharePoint:', error);
            throw new InternalServerError('Failed to get file metadata from SharePoint');
        }
    }

    /**
     * Update File Metadata
     * 
     * Updates custom metadata fields for a file in SharePoint.
     * 
     * @async
     * @param {string} fileId - SharePoint file ID
     * @param {Object} metadata - Metadata to update
     * @returns {Promise<Object>} Updated file information
     * @throws {InternalServerError} If metadata update fails
     */
    async updateFileMetadata(fileId, metadata) {
        try {
            const client = await this.getClient();
            const metadataUrl = `/drives/${this.driveId}/items/${fileId}`;

            // Map metadata fields to SharePoint field names
            const fields = {};
            if (metadata.ipRecordId) fields.IPRecordId = metadata.ipRecordId;
            if (metadata.disclosureId) fields.DisclosureId = metadata.disclosureId;
            if (metadata.licenceId) fields.LicenceId = metadata.licenceId;
            if (metadata.documentType) fields.DocumentType = metadata.documentType;
            if (metadata.description) fields.Description = metadata.description;
            if (metadata.tags) fields.Tags = metadata.tags;
            if (metadata.confidentiality) fields.Confidentiality = metadata.confidentiality;

            const response = await client.api(metadataUrl)
                .update({
                    fields: fields
                });

            return response;

        } catch (error) {
            logger.error('Failed to update file metadata in SharePoint:', error);
            throw new InternalServerError('Failed to update file metadata in SharePoint');
        }
    }

    /**
     * Create Folder in SharePoint
     * 
     * Creates a new folder in SharePoint at the specified path.
     * 
     * @async
     * @param {string} folderPath - Parent folder path (relative to library root)
     * @param {string} folderName - Folder name
     * @returns {Promise<Object>} Created folder information
     * @throws {InternalServerError} If folder creation fails
     * 
     * @example
     * // Creates TTOPortalDocuments/IPAssets/123
     * await client.createFolder('IPAssets', '123');
     */
    async createFolder(folderPath, folderName) {
        try {
            const client = await this.getClient();
            const driveId = this.driveId;

            const fullPath = folderPath ? `${folderPath}/${folderName}` : folderName;
            const folderUrl = `/drives/${driveId}/root:/${fullPath}`;

            logger.info('Creating folder in SharePoint', { 
                folderPath: fullPath,
                library: 'TTOPortalDocuments'
            });

            const response = await client.api(folderUrl)
                .put({
                    name: folderName,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename'
                });

            return {
                id: response.id,
                name: response.name,
                webUrl: response.webUrl,
                folderPath: fullPath
            };

        } catch (error) {
            logger.error('Failed to create folder in SharePoint:', error);
            throw new InternalServerError('Failed to create folder in SharePoint');
        }
    }

    /**
     * Delete File from SharePoint
     * 
     * Permanently deletes a file from SharePoint using its ID.
     * 
     * @async
     * @param {string} fileId - SharePoint file ID
     * @returns {Promise<boolean>} True if deletion was successful
     * @throws {InternalServerError} If deletion fails
     */
    async deleteFile(fileId) {
        try {
            const client = await this.getClient();
            const deleteUrl = `/drives/${this.driveId}/items/${fileId}`;

            await client.api(deleteUrl).delete();

            logger.info('File deleted from SharePoint', { fileId });
            return true;

        } catch (error) {
            logger.error('Failed to delete file from SharePoint:', error);
            throw new InternalServerError('Failed to delete file from SharePoint');
        }
    }

    /**
     * List Files in Folder
     * 
     * Retrieves a list of files and folders from a SharePoint folder.
     * 
     * @async
     * @param {string} folderPath - SharePoint folder path (relative to library root)
     * @param {number} limit - Maximum results (default: 100)
     * @returns {Promise<Array>} List of files and folders
     * @throws {InternalServerError} If listing fails
     * 
     * @example
     * // Lists contents of TTOPortalDocuments/IPAssets
     * await client.listFiles('IPAssets');
     */
    async listFiles(folderPath, limit = 100) {
        try {
            const client = await this.getClient();
            const driveId = this.driveId;

            const listUrl = `/drives/${driveId}/root:/${folderPath}:/children`;

            const response = await client.api(listUrl)
                .select('id,name,size,webUrl,createdDateTime,lastModifiedDateTime,folder')
                .top(limit)
                .get();

            return response.value.map(item => ({
                id: item.id,
                name: item.name,
                size: item.size,
                webUrl: item.webUrl,
                createdDateTime: item.createdDateTime,
                lastModifiedDateTime: item.lastModifiedDateTime,
                isFolder: !!item.folder
            }));

        } catch (error) {
            logger.error('Failed to list files from SharePoint:', error);
            throw new InternalServerError('Failed to list files from SharePoint');
        }
    }

    /**
     * Get SharePoint Drive Information
     * 
     * Retrieves information about the SharePoint drive/document library.
     * 
     * @async
     * @returns {Promise<Object>} Drive information
     * @throws {InternalServerError} If drive info retrieval fails
     */
    async getDriveInfo() {
        try {
            const client = await this.getClient();
            const driveUrl = `/drives/${this.driveId}`;

            const response = await client.api(driveUrl)
                .select('id,name,description,webUrl,driveType,quota')
                .get();

            return {
                id: response.id,
                name: response.name,
                description: response.description,
                webUrl: response.webUrl,
                driveType: response.driveType,
                totalSize: response.quota?.total || 0,
                usedSize: response.quota?.used || 0,
                remainingSize: response.quota?.remaining || 0
            };

        } catch (error) {
            logger.error('Failed to get drive info from SharePoint:', error);
            throw new InternalServerError('Failed to get drive info from SharePoint');
        }
    }
}

module.exports = new SharePointClient();