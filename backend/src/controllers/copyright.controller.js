// src/controllers/copyright.controller.js
const copyrightService = require('../services/copyright.service');
const { catchAsync } = require('../middleware/error.middleware');

exports.create = catchAsync(async (req, res) => {
    const { disclosureId, ...copyrightData } = req.body;
    
    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const copyright = await copyrightService.createCopyrightFromDisclosure(
        disclosureId,
        copyrightData
    );

    res.status(201).json({
        success: true,
        data: copyright,
        message: 'Copyright created successfully'
    });
});

exports.findAll = catchAsync(async (req, res) => {
    const { status, workType, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (workType) filters.workType = workType;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const copyrights = await copyrightService.getCopyrights(
        filters,
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: copyrights,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: copyrights.length
        }
    });
});

exports.findById = catchAsync(async (req, res) => {
    const copyright = await copyrightService.getCopyrightById(req.params.id);

    if (!copyright) {
        return res.status(404).json({
            success: false,
            message: 'Copyright not found'
        });
    }

    res.json({
        success: true,
        data: copyright
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

    const copyright = await copyrightService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: copyright,
        message: `Copyright status updated to ${status}`
    });
});

exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await copyrightService.getStatistics();

    res.json({
        success: true,
        data: statistics
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

    const results = await copyrightService.searchCopyrights(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

exports.findByRegistrationNumber = catchAsync(async (req, res) => {
    const copyright = await copyrightService.findByRegistrationNumber(req.params.number);

    if (!copyright) {
        return res.status(404).json({
            success: false,
            message: 'Copyright not found'
        });
    }

    res.json({
        success: true,
        data: copyright
    });
});

exports.findByAuthor = catchAsync(async (req, res) => {
    const copyrights = await copyrightService.findByAuthor(req.params.personId);

    res.json({
        success: true,
        data: copyrights,
        count: copyrights.length
    });
});

exports.findByWorkType = catchAsync(async (req, res) => {
    const copyrights = await copyrightService.findByWorkType(req.params.workType);

    res.json({
        success: true,
        data: copyrights,
        count: copyrights.length
    });
});