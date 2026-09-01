/**
 * Document Routes
 * ===============
 * Defines REST API endpoints for document management.
 * All routes require authentication and appropriate role authorization.
 * 
 * @module routes/document.routes
 * @requires express
 * @requires ../middleware/auth.middleware
 * @requires ../controllers/document.controller
 * @requires multer
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const documentController = require('../controllers/document.controller');
const { validate } = require('../middleware/validation.middleware');
const { schemas } = require('../middleware/validation.middleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                          'image/jpeg', 'image/png', 'text/plain'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, and TXT files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: fileFilter
});

// All document routes require authentication
router.use(authenticate);

/**
 * @route POST /api/v1/documents/upload/:ipRecordId
 * @description Upload a document for an IP record
 * @access Researcher, TTO Officer, Admin
 */
router.post(
    '/upload/:ipRecordId',
    authorize('Researcher', 'TTO Officer', 'Admin'),
    upload.single('file'),
    validate(schemas.document.upload, 'body'),
    documentController.upload
);

/**
 * @route GET /api/v1/documents/:id
 * @description Get document by ID
 * @access Private - requires authentication
 */
router.get(
    '/:id',
    documentController.findById
);

/**
 * @route GET /api/v1/documents/:id/download
 * @description Download document
 * @access Private - requires authentication
 */
router.get(
    '/:id/download',
    documentController.download
);

/**
 * @route GET /api/v1/documents/ip-record/:ipRecordId
 * @description Get all documents for an IP record
 * @access Private - requires authentication
 */
router.get(
    '/ip-record/:ipRecordId',
    documentController.findByIpRecord
);

/**
 * @route DELETE /api/v1/documents/:id
 * @description Delete a document
 * @access Researcher (owner), TTO Officer, Admin
 */
router.delete(
    '/:id',
    authorize('Researcher', 'TTO Officer', 'Admin'),
    documentController.delete
);

/**
 * @route PATCH /api/v1/documents/:id/metadata
 * @description Update document metadata
 * @access Researcher (owner), TTO Officer, Admin
 */
router.patch(
    '/:id/metadata',
    authorize('Researcher', 'TTO Officer', 'Admin'),
    validate(schemas.document.update, 'body'),
    documentController.updateMetadata
);

/**
 * @route POST /api/v1/documents/:id/version
 * @description Create a new version of a document
 * @access Researcher, TTO Officer, Admin
 */
router.post(
    '/:id/version',
    authorize('Researcher', 'TTO Officer', 'Admin'),
    upload.single('file'),
    documentController.createVersion
);

/**
 * @route GET /api/v1/documents/:id/versions
 * @description Get version history of a document
 * @access Private - requires authentication
 */
router.get(
    '/:id/versions',
    documentController.getVersionHistory
);

module.exports = router;