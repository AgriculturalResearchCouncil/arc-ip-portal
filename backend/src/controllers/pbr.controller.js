// src/controllers/pbr.controller.js
/**
 * PBR Controller
 * ==============
 * HTTP handlers for PBR management endpoints.
 * Provides REST API for:
 * - Creating PBRs from disclosures
 * - Retrieving PBRs with filtering
 * - Updating PBR status
 * - Managing renewals
 * - PBR searches
 * - Statistics and reports
 * 
 * @module controllers/pbr.controller
 * @requires ../services/pbr.service
 * @requires ../middleware/error.middleware
 */

const pbrService = require('../services/pbr.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

exports.create = catchAsync(async (req, res) => {
    const { disclosureId, ...pbrData } = req.body;
    
    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const pbr = await pbrService.createPbrFromDisclosure(disclosureId, pbrData);

    res.status(201).json({
        success: true,
        data: pbr,
        message: 'PBR created successfully'
    });
});

exports.findAll = catchAsync(async (req, res) => {
    const { status, species, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (species) filters.species = species;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const pbrs = await pbrService.getPbrs(
        filters,
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: pbrs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: pbrs.length
        }
    });
});

exports.findById = catchAsync(async (req, res) => {
    const pbr = await pbrService.getPbrById(req.params.id);

    if (!pbr) {
        return res.status(404).json({
            success: false,
            message: 'PBR not found'
        });
    }

    res.json({
        success: true,
        data: pbr
    });
});

exports.updateStatus = catchAsync(async (req, res) => {
    const { status, metadata } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const pbr = await pbrService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: pbr,
        message: `PBR status updated to ${status}`
    });
});

exports.recordRenewal = catchAsync(async (req, res) => {
    const { renewalDueDate, amountPaid, paymentReference } = req.body;

    if (!renewalDueDate) {
        return res.status(400).json({
            success: false,
            message: 'Renewal due date is required'
        });
    }

    const pbr = await pbrService.recordRenewal(
        req.params.id,
        {
            renewalDate: new Date(),
            renewalDueDate,
            amountPaid,
            paymentReference
        },
        req.user.person_id
    );

    res.json({
        success: true,
        data: pbr,
        message: 'PBR renewal recorded successfully'
    });
});

exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await pbrService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

exports.getExpiringSoon = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 180;
    const pbrs = await pbrService.getExpiringSoon(days);

    res.json({
        success: true,
        data: pbrs,
        count: pbrs.length,
        daysThreshold: days
    });
});

exports.search = catchAsync(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const results = await pbrService.searchPbrs(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

exports.findByApplicationNumber = catchAsync(async (req, res) => {
    const pbr = await pbrRepository.findByApplicationNumber(req.params.number);

    if (!pbr) {
        return res.status(404).json({
            success: false,
            message: 'PBR not found'
        });
    }

    res.json({
        success: true,
        data: pbr
    });
});