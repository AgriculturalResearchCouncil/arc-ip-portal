// src/controllers/trade-secret.controller.js
const tradeSecretService = require('../services/trade-secret.service');
const { catchAsync } = require('../middleware/error.middleware');

exports.create = catchAsync(async (req, res) => {
    const { disclosureId, ...tradeSecretData } = req.body;
    
    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const tradeSecret = await tradeSecretService.createTradeSecretFromDisclosure(
        disclosureId,
        tradeSecretData
    );

    res.status(201).json({
        success: true,
        data: tradeSecret,
        message: 'Trade secret created successfully'
    });
});

exports.findAll = catchAsync(async (req, res) => {
    const { status, secretType, clearanceLevel, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (secretType) filters.secretType = secretType;
    if (clearanceLevel) filters.clearanceLevel = clearanceLevel;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const tradeSecrets = await tradeSecretService.getTradeSecrets(
        filters,
        req.user.person_id,
        req.user.role
    );

    res.json({
        success: true,
        data: tradeSecrets,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: tradeSecrets.length
        }
    });
});

exports.findById = catchAsync(async (req, res) => {
    const tradeSecret = await tradeSecretService.getTradeSecretById(req.params.id);

    if (!tradeSecret) {
        return res.status(404).json({
            success: false,
            message: 'Trade secret not found'
        });
    }

    res.json({
        success: true,
        data: tradeSecret
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

    const tradeSecret = await tradeSecretService.updateStatus(
        req.params.id,
        status,
        req.user.person_id,
        metadata
    );

    res.json({
        success: true,
        data: tradeSecret,
        message: `Trade secret status updated to ${status}`
    });
});

exports.recordNda = catchAsync(async (req, res) => {
    const { partyName, expiryDate, agreementReference } = req.body;

    if (!partyName) {
        return res.status(400).json({
            success: false,
            message: 'Party name is required'
        });
    }

    const tradeSecret = await tradeSecretService.recordNda(
        req.params.id,
        {
            partyName,
            expiryDate,
            agreementReference
        },
        req.user.person_id
    );

    res.json({
        success: true,
        data: tradeSecret,
        message: 'NDA recorded successfully'
    });
});

exports.grantClearance = catchAsync(async (req, res) => {
    const { personId, clearanceLevel } = req.body;

    if (!personId || !clearanceLevel) {
        return res.status(400).json({
            success: false,
            message: 'Person ID and clearance level are required'
        });
    }

    const tradeSecret = await tradeSecretService.grantClearance(
        req.params.id,
        personId,
        clearanceLevel,
        req.user.person_id
    );

    res.json({
        success: true,
        data: tradeSecret,
        message: 'Clearance granted successfully'
    });
});

exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await tradeSecretService.getStatistics();

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

    const results = await tradeSecretService.searchTradeSecrets(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

exports.findByClearanceLevel = catchAsync(async (req, res) => {
    const tradeSecrets = await tradeSecretService.getByClearanceLevel(req.params.level);

    res.json({
        success: true,
        data: tradeSecrets,
        count: tradeSecrets.length
    });
});