// src/controllers/commercialisation.controller.js
/**
 * Commercialisation Controller
 * ============================
 * HTTP handlers for commercialisation endpoints.
 * Covers BPS Process 6: Commercialisation.
 * 
 * @module controllers/commercialisation.controller
 * @requires ../services/commercialisation.service
 * @requires ../middleware/error.middleware
 */

const commercialisationService = require('../services/commercialisation.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates a new commercialisation project.
 * Corresponds to BPS Process 6 Step 5: Develop commercialisation plan.
 * 
 * @route POST /api/v1/commercialisations
 * @access Private - TTO Officer, Admin
 */
exports.create = catchAsync(async (req, res) => {
    const { ipRecordId, ...commercialisationData } = req.body;

    if (!ipRecordId) {
        return res.status(400).json({
            success: false,
            message: 'IP Record ID is required'
        });
    }

    const commercialisation = await commercialisationService.createCommercialisation(
        ipRecordId,
        commercialisationData,
        req.user.person_id
    );

    res.status(201).json({
        success: true,
        data: commercialisation,
        message: 'Commercialisation project created successfully'
    });
});

/**
 * Conducts a market assessment.
 * Corresponds to BPS Process 6 Step 1: Conduct market assessment.
 * 
 * @route POST /api/v1/commercialisations/market-assessment
 * @access Private - TTO Officer, Admin
 */
exports.conductMarketAssessment = catchAsync(async (req, res) => {
    const {
        disclosureId,
        marketSizeDescription,
        targetCustomers,
        competitors,
        commercializationNotes,
        marketOpportunityScore
    } = req.body;

    if (!disclosureId) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID is required'
        });
    }

    const assessment = await commercialisationService.conductMarketAssessment(
        disclosureId,
        {
            marketSizeDescription,
            targetCustomers,
            competitors,
            commercializationNotes,
            marketOpportunityScore
        },
        req.user.person_id
    );

    res.json({
        success: true,
        data: assessment,
        message: 'Market assessment conducted successfully'
    });
});

/**
 * Gets market assessments by disclosure.
 * 
 * @route GET /api/v1/commercialisations/market-assessments/:disclosureId
 * @access Private - TTO Officer, Admin
 */
exports.getMarketAssessments = catchAsync(async (req, res) => {
    const assessments = await commercialisationService.getMarketAssessmentsByDisclosure(
        req.params.disclosureId
    );

    res.json({
        success: true,
        data: assessments,
        count: assessments.length
    });
});

/**
 * Gets a market assessment by ID.
 * 
 * @route GET /api/v1/commercialisations/market-assessment/:assessmentId
 * @access Private - TTO Officer, Admin
 */
exports.getMarketAssessmentById = catchAsync(async (req, res) => {
    const assessment = await commercialisationService.getMarketAssessmentById(req.params.assessmentId);

    if (!assessment) {
        return res.status(404).json({
            success: false,
            message: 'Market assessment not found'
        });
    }

    res.json({
        success: true,
        data: assessment
    });
});

/**
 * Gets all commercialisation projects with filtering.
 * 
 * @route GET /api/v1/commercialisations
 * @access Private - TTO Officer, Admin, Executive
 */
exports.findAll = catchAsync(async (req, res) => {
    const { status, model, minRevenue, maxRevenue, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (model) filters.model = model;
    if (minRevenue) filters.minRevenue = parseFloat(minRevenue);
    if (maxRevenue) filters.maxRevenue = parseFloat(maxRevenue);
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const projects = await commercialisationService.getCommercialisations(filters);

    const statistics = await commercialisationService.getStatistics();
    const totalCount = statistics.total_projects || projects.length;

    res.json({
        success: true,
        data: projects,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        }
    });
});

/**
 * Gets commercialisation by ID.
 * 
 * @route GET /api/v1/commercialisations/:id
 * @access Private - TTO Officer, Admin, Executive
 */
exports.findById = catchAsync(async (req, res) => {
    const commercialisation = await commercialisationService.getCommercialisationById(req.params.id);

    if (!commercialisation) {
        return res.status(404).json({
            success: false,
            message: 'Commercialisation project not found'
        });
    }

    res.json({
        success: true,
        data: commercialisation
    });
});

/**
 * Updates commercialisation status.
 * 
 * @route PATCH /api/v1/commercialisations/:id/status
 * @access Private - TTO Officer, Admin
 */
exports.updateStatus = catchAsync(async (req, res) => {
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({
            success: false,
            message: 'Status is required'
        });
    }

    const commercialisation = await commercialisationService.updateStatus(
        req.params.id,
        status,
        req.user.person_id
    );

    res.json({
        success: true,
        data: commercialisation,
        message: `Commercialisation status updated to ${status}`
    });
});

/**
 * Updates a commercialisation project.
 * 
 * @route PUT /api/v1/commercialisations/:id
 * @access Private - TTO Officer, Admin
 */
exports.update = catchAsync(async (req, res) => {
    const commercialisation = await commercialisationService.updateCommercialisation(
        req.params.id,
        req.body,
        req.user.person_id
    );

    res.json({
        success: true,
        data: commercialisation,
        message: 'Commercialisation project updated successfully'
    });
});

/**
 * Gets commercialisation statistics.
 * 
 * @route GET /api/v1/commercialisations/statistics
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await commercialisationService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Searches commercialisation projects.
 * 
 * @route GET /api/v1/commercialisations/search
 * @access Private - TTO Officer, Admin
 */
exports.search = catchAsync(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Search query must be at least 2 characters'
        });
    }

    const results = await commercialisationService.searchCommercialisations(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});

/**
 * Gets commercialisation projects by IP record.
 * 
 * @route GET /api/v1/commercialisations/ip-record/:ipRecordId
 * @access Private - TTO Officer, Admin
 */
exports.findByIpRecord = catchAsync(async (req, res) => {
    const projects = await commercialisationService.getByIpRecord(req.params.ipRecordId);

    res.json({
        success: true,
        data: projects,
        count: projects.length
    });
});

/**
 * Gets commercialisation projects by model.
 * 
 * @route GET /api/v1/commercialisations/model/:model
 * @access Private - TTO Officer, Admin
 */
exports.findByModel = catchAsync(async (req, res) => {
    const projects = await commercialisationService.getByModel(req.params.model);

    res.json({
        success: true,
        data: projects,
        count: projects.length
    });
});