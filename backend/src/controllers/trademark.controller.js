// src/controllers/trademark.controller.js
const trademarkService = require('../services/trademark.service');
const { catchAsync } = require('../middleware/error.middleware');

exports.create = catchAsync(async (req, res) => {
    const { disclosureId, ...trademarkData } = req.body;
    
    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const trademark = await trademarkService.createTrademarkFromDisclosure(
        disclosureId,
        trademarkData
    );

    res.status(201).json({
        success: true,
        data: trademark,
        message: 'Trademark created successfully'
    });
});

exports.findAll = catchAsync(async (req, res) => {
    const { status, trademarkType, classNumber, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (trademarkType) filters.trademarkType = trademarkType;
    if (classNumber) filters.classNumber = parseInt(classNumber);
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const trademarks = await trademarkService.getTrademarks(
        filters,
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: trademarks,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: trademarks.length
        }
    });
});

exports.findById = catchAsync(async (req, res) => {
    const trademark = await trademarkService.getTrademarkById(req.params.id);

    if (!trademark) {
        return res.status(404).json({
            success: false,
            message: 'Trademark not found'
        });
    }

    res.json({
        success: true,
        data: trademark
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

    const trademark = await trademarkService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: trademark,
        message: `Trademark status updated to ${status}`
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

    const trademark = await trademarkService.recordRenewal(
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
        data: trademark,
        message: 'Trademark renewal recorded successfully'
    });
});

exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await trademarkService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

exports.getExpiringSoon = catchAsync(async (req, res) => {
    const days = parseInt(req.query.days) || 180;
    const trademarks = await trademarkService.getExpiringSoon(days);

    res.json({
        success: true,
        data: trademarks,
        count: trademarks.length,
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

    const results = await trademarkService.searchTrademarks(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

exports.findByRegistrationNumber = catchAsync(async (req, res) => {
    const trademark = await trademarkService.findByRegistrationNumber(req.params.number);

    if (!trademark) {
        return res.status(404).json({
            success: false,
            message: 'Trademark not found'
        });
    }

    res.json({
        success: true,
        data: trademark
    });
});