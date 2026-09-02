// src/controllers/design.controller.js
const designService = require('../services/design.service');
const { catchAsync } = require('../middleware/error.middleware');

exports.create = catchAsync(async (req, res) => {
    const { disclosureId, ...designData } = req.body;
    
    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const design = await designService.createDesignFromDisclosure(
        disclosureId,
        designData
    );

    res.status(201).json({
        success: true,
        data: design,
        message: 'Design created successfully'
    });
});

exports.findAll = catchAsync(async (req, res) => {
    const { status, designType, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (designType) filters.designType = designType;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const designs = await designService.getDesigns(
        filters,
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: designs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: designs.length
        }
    });
});

exports.findById = catchAsync(async (req, res) => {
    const design = await designService.getDesignById(req.params.id);

    if (!design) {
        return res.status(404).json({
            success: false,
            message: 'Design not found'
        });
    }

    res.json({
        success: true,
        data: design
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

    const design = await designService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: design,
        message: `Design status updated to ${status}`
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

    const design = await designService.recordRenewal(
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
        data: design,
        message: 'Design renewal recorded successfully'
    });
});

exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await designService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

exports.getExpiringSoon = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 180;
    const designs = await designService.getExpiringSoon(days);

    res.json({
        success: true,
        data: designs,
        count: designs.length,
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

    const results = await designService.searchDesigns(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

exports.findByRegistrationNumber = catchAsync(async (req, res) => {
    const design = await designService.findByRegistrationNumber(req.params.number);

    if (!design) {
        return res.status(404).json({
            success: false,
            message: 'Design not found'
        });
    }

    res.json({
        success: true,
        data: design
    });
});

exports.findByType = catchAsync(async (req, res) => {
    const designs = await designService.findByType(req.params.type);

    res.json({
        success: true,
        data: designs,
        count: designs.length
    });
});