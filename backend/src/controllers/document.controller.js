/**
 * Document Controller
 * ===================
 * Handles HTTP requests for document management.
 * Provides REST API endpoints for:
 * - Uploading documents
 * - Retrieving documents
 * - Downloading documents
 * - Deleting documents
 * - Managing document versions
 * - Updating document metadata
 * 
 * @module controllers/document.controller
 * @requires ../services/document.service
 * @requires ../middleware/error.middleware
 */

const documentService = require('../services/document.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Uploads a document.
 * 
 * @route POST /api/v1/documents/upload/:ipRecordId
 * @access Private - Researcher, TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {Object} req.file - File from multer
 * @param {string} req.params.ipRecordId - IP record UUID
 * @param {Object} req.body - Document metadata
 * @param {Object} res - Express response object
 * @returns {Object} Created document
 */
exports.upload = catchAsync(async (req, res) => {
    const { ipRecordId } = req.params;
    const file = req.file;
    const metadata = req.body;
    
    if (!file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded'
        });
    }

    const document = await documentService.uploadDocument(
        file,
        ipRecordId,
        req.user.person_id,
        metadata
    );

    res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploaded successfully'
    });
});

/**
 * Gets document by ID.
 * 
 * @route GET /api/v1/documents/:id
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Document UUID
 * @param {Object} res - Express response object
 * @returns {Object} Document object
 */
exports.findById = catchAsync(async (req, res) => {
    const document = await documentService.getDocument(
        req.params.id,
        req.user.person_id
    );
    
    res.json({
        success: true,
        data: document
    });
});

/**
 * Downloads a document.
 * 
 * @route GET /api/v1/documents/:id/download
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Document UUID
 * @param {Object} res - Express response object
 * @returns {Object} File download
 */
exports.download = catchAsync(async (req, res) => {
    const document = await documentService.getDocument(
        req.params.id,
        req.user.person_id
    );
    
    // Log download
    logger.logAudit('DOCUMENT_DOWNLOADED', req.user.person_id, {
        documentId: req.params.id,
        fileName: document.file_name
    });

    // If SharePoint document, redirect to SharePoint URL
    if (document.sharepoint_id) {
        return res.redirect(document.download_url);
    }

    // If local file, send file
    if (document.storage_path) {
        return res.download(document.storage_path, document.file_name);
    }

    return res.status(404).json({
        success: false,
        message: 'Document file not found'
    });
});

/**
 * Gets all documents for an IP record.
 * 
 * @route GET /api/v1/documents/ip-record/:ipRecordId
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {string} req.params.ipRecordId - IP record UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of documents
 */
exports.findByIpRecord = catchAsync(async (req, res) => {
    const { ipRecordId } = req.params;
    const documents = await documentService.getDocumentsByIpRecord(
        ipRecordId,
        req.user.person_id
    );
    
    res.json({
        success: true,
        data: documents,
        count: documents.length
    });
});

/**
 * Deletes a document.
 * 
 * @route DELETE /api/v1/documents/:id
 * @access Private - Researcher (owner), TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Document UUID
 * @param {Object} res - Express response object
 * @returns {Object} Success message
 */
exports.delete = catchAsync(async (req, res) => {
    await documentService.deleteDocument(
        req.params.id,
        req.user.person_id
    );
    
    res.json({
        success: true,
        message: 'Document deleted successfully'
    });
});

/**
 * Updates document metadata.
 * 
 * @route PATCH /api/v1/documents/:id/metadata
 * @access Private - Researcher (owner), TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Document UUID
 * @param {Object} req.body - Update data
 * @param {Object} res - Express response object
 * @returns {Object} Updated document
 */
exports.updateMetadata = catchAsync(async (req, res) => {
    const document = await documentService.updateDocumentMetadata(
        req.params.id,
        req.body,
        req.user.person_id
    );
    
    res.json({
        success: true,
        data: document,
        message: 'Document metadata updated successfully'
    });
});

/**
 * Creates a new version of a document.
 * 
 * @route POST /api/v1/documents/:id/version
 * @access Private - Researcher, TTO Officer, Admin
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Document UUID
 * @param {Object} req.file - File from multer
 * @param {string} [req.body.versionComment] - Version comment
 * @param {Object} res - Express response object
 * @returns {Object} New document version
 */
exports.createVersion = catchAsync(async (req, res) => {
    const { id } = req.params;
    const file = req.file;
    const { versionComment } = req.body;
    
    if (!file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded for new version'
        });
    }

    const newVersion = await documentService.createNewVersion(
        id,
        file,
        req.user.person_id,
        versionComment
    );
    
    res.status(201).json({
        success: true,
        data: newVersion,
        message: 'New document version created successfully'
    });
});

/**
 * Gets version history of a document.
 * 
 * @route GET /api/v1/documents/:id/versions
 * @access Private - requires authentication
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Document UUID
 * @param {Object} res - Express response object
 * @returns {Object} Array of document versions
 */
exports.getVersionHistory = catchAsync(async (req, res) => {
    const versions = await documentService.getVersionHistory(
        req.params.id,
        req.user.person_id
    );
    
    res.json({
        success: true,
        data: versions,
        count: versions.length
    });
});