// src/config/sharepoint.js
/**
 * SharePoint Configuration Module
 * ================================
 * Manages SharePoint integration settings and configuration.
 * 
 * This module provides configuration for:
 * - Microsoft Graph API authentication
 * - SharePoint site and document library settings
 * - Folder structure for different entity types
 * - Document categorization
 * - Retry logic configuration
 * - File size limits and allowed MIME types
 * 
 * @module config/sharepoint
 * @requires ./index
 */

const config = require('./index');

module.exports = {
    /**
     * SharePoint Authentication Settings
     * These credentials are used to authenticate with Microsoft Graph API
     * using OAuth2 Client Credentials flow
     */
    tenantId: config.sharepoint.tenantId,
    clientId: config.sharepoint.clientId,
    clientSecret: config.sharepoint.clientSecret,
    siteId: config.sharepoint.siteId,
    driveId: config.sharepoint.driveId,
    baseUrl: config.sharepoint.baseUrl || 'https://graph.microsoft.com/v1.0',
    siteUrl: config.sharepoint.siteUrl || 'https://arcagricza2.sharepoint.com/sites/DevOTT',
    documentLibrary: config.sharepoint.libraryName || 'IPDocuments',

    /**
     * SharePoint Document Libraries
     * Specific document libraries for different document types
     */
    libraries: {
        ipDocs: config.sharepoint.ipDocsLibrary || 'IPDocuments',
        disclosures: config.sharepoint.disclosuresLibrary || 'Disclosures',
        licences: config.sharepoint.licencesLibrary || 'Licences',
        patents: config.sharepoint.patentsLibrary || 'Patents',
        pbr: config.sharepoint.pbrLibrary || 'PBR',
        trademarks: config.sharepoint.trademarksLibrary || 'Trademarks',
        commercialisation: config.sharepoint.commercialisationLibrary || 'Commercialisation'
    },

    /**
     * Folder Structure Mapping
     * Defines the folder hierarchy for different entity types in SharePoint.
     * The {entityId} placeholder will be replaced with the actual record ID.
     * 
     * Example: For IP Record ID "123e4567-e89b-12d3-a456-426614174000",
     * the folder path will be "IPDocuments/IPAssets/123e4567-e89b-12d3-a456-426614174000"
     * 
     * Each entity type maps to its corresponding document library
     */
    folderStructure: {
        ipAssets: {
            library: 'ipDocs',
            path: 'IPAssets/{ipRecordId}'
        },
        disclosures: {
            library: 'disclosures',
            path: 'Disclosures/{disclosureId}'
        },
        licences: {
            library: 'licences',
            path: 'Licences/{licenceId}'
        },
        patents: {
            library: 'patents',
            path: 'Patents/{patentId}'
        },
        pbr: {
            library: 'pbr',
            path: 'PBR/{pbrId}'
        },
        trademarks: {
            library: 'trademarks',
            path: 'Trademarks/{trademarkId}'
        },
        commercialisation: {
            library: 'commercialisation',
            path: 'Commercialisation/{commercialisationId}'
        }
    },

    /**
     * Document Category Definitions
     * Used to classify documents by their type within the system.
     * This enables proper metadata tagging and search filtering.
     */
    documentCategories: {
        DISCLOSURE: 'Disclosure',
        PATENT: 'Patent',
        PBR: 'PBR',
        TRADEMARK: 'Trademark',
        LICENCE: 'Licence',
        COMMERCIALISATION: 'Commercialisation',
        GENERAL: 'General',
        AGREEMENT: 'Agreement',
        REPORT: 'Report',
        CERTIFICATE: 'Certificate',
        CORRESPONDENCE: 'Correspondence'
    },

    /**
     * SharePoint List Mappings
     * Maps portal entities to SharePoint list names for metadata sync
     */
    listMappings: {
        persons: 'Persons',
        ipRecords: 'IPRecords',
        disclosures: 'Disclosures',
        licences: 'Licences',
        patents: 'Patents',
        pbr: 'PBR'
    },

    /**
     * Retry Configuration
     * Implements exponential backoff for SharePoint API calls
     * to handle transient failures and rate limiting.
     */
    retry: {
        maxRetries: parseInt(config.sharepoint.retryMax) || 3,
        initialDelay: parseInt(config.sharepoint.retryDelay) || 1000,
        maxDelay: parseInt(config.sharepoint.retryMaxDelay) || 10000,
        backoffFactor: 2
    },

    /**
     * File Size and Type Limits
     * Defines allowed file types and size constraints for document uploads.
     * This ensures security and performance compliance.
     */
    fileSizeLimits: {
        maxFileSize: parseInt(config.sharepoint.maxFileSize) || 50,
        allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/tiff',
            'text/plain',
            'application/zip',
            'application/x-zip-compressed'
        ],
        allowedExtensions: [
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.ppt', '.pptx', '.jpg', '.jpeg', '.png',
            '.tiff', '.txt', '.zip'
        ]
    },

    /**
     * SharePoint Site Information
     * Additional site-specific configuration
     */
    siteInfo: {
        siteUrl: config.sharepoint.siteUrl || 'https://arcagricza2.sharepoint.com/sites/DevOTT',
        siteName: 'DevOTT',
        description: 'ARC OTT Development Site',
        rootFolder: '/sites/DevOTT'
    },

    /**
     * SharePoint Field Mappings
     * Maps portal fields to SharePoint list columns
     */
    fieldMappings: {
        ipRecord: {
            id: 'IPRecordId',
            title: 'Title',
            referenceNumber: 'ReferenceNumber',
            status: 'Status',
            ownerId: 'OwnerId',
            recordType: 'RecordType'
        },
        disclosure: {
            id: 'DisclosureId',
            title: 'Title',
            status: 'ReviewStatus',
            category: 'DisclosureCategory',
            researcherId: 'ResearcherId'
        },
        licence: {
            id: 'LicenceId',
            licenceNumber: 'LicenceNumber',
            status: 'Status',
            licenseeName: 'LicenseeName',
            ipRecordId: 'IPRecordId'
        }
    },

    /**
     * SharePoint Sync Settings
     * Controls how data is synchronized between portal and SharePoint
     */
    sync: {
        enabled: process.env.ENABLE_SHAREPOINT_SYNC === 'true',
        interval: parseInt(process.env.SHAREPOINT_SYNC_INTERVAL) || 300000, // 5 minutes
        batchSize: parseInt(process.env.SHAREPOINT_SYNC_BATCH) || 100,
        retryOnFailure: true,
        syncFields: {
            ipRecords: ['title', 'status', 'referenceNumber', 'recordType'],
            disclosures: ['title', 'status', 'disclosureCategory'],
            licences: ['licenceNumber', 'status', 'licenseeName']
        }
    },

    /**
     * SharePoint Logging Settings
     */
    logging: {
        enabled: true,
        level: 'info',
        logOperations: ['upload', 'download', 'delete', 'update', 'sync']
    }
};

/**
 * Helper function to get the full SharePoint path for a given entity
 * 
 * @param {string} entityType - The entity type (ipAssets, disclosures, etc.)
 * @param {string} entityId - The entity ID
 * @returns {Object} Object containing library and path
 * 
 * @example
 * const path = sharepointConfig.getSharePointPath('ipAssets', '123');
 * // Returns: { library: 'IPDocuments', path: 'IPAssets/123' }
 */
module.exports.getSharePointPath = (entityType, entityId) => {
    const structure = module.exports.folderStructure[entityType];
    if (!structure) {
        throw new Error(`Unknown entity type: ${entityType}`);
    }
    
    const libraryName = module.exports.libraries[structure.library];
    const path = structure.path.replace(/{[^}]+}/g, entityId);
    
    return {
        library: libraryName,
        path: path,
        fullPath: `${libraryName}/${path}`
    };
};

/**
 * Helper function to get the SharePoint list name for a given entity type
 * 
 * @param {string} entityType - The entity type
 * @returns {string} SharePoint list name
 */
module.exports.getSharePointList = (entityType) => {
    return module.exports.listMappings[entityType] || null;
};

/**
 * Helper function to check if a file type is allowed
 * 
 * @param {string} fileName - The file name
 * @param {string} mimeType - The MIME type
 * @returns {boolean} True if allowed
 */
module.exports.isFileTypeAllowed = (fileName, mimeType) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const hasAllowedExtension = module.exports.fileSizeLimits.allowedExtensions.includes(`.${extension}`);
    const hasAllowedMimeType = module.exports.fileSizeLimits.allowedMimeTypes.includes(mimeType);
    
    return hasAllowedExtension && hasAllowedMimeType;
};

/**
 * Helper function to get document category from document type
 * 
 * @param {string} documentType - The document type
 * @returns {string} Document category
 */
module.exports.getDocumentCategory = (documentType) => {
    const categories = module.exports.documentCategories;
    const type = documentType.toUpperCase();
    
    return categories[type] || categories.GENERAL;
};