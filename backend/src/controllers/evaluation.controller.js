// src/controllers/evaluation.controller.js
/**
 * Technology Evaluation Controller
 * =================================
 * HTTP handlers for technology evaluation endpoints.
 * Provides REST API for:
 * - Creating evaluations (Process 3 Step 1-2)
 * - Adding assessment criteria (Process 3 Step 3-10)
 * - Recording prior art searches (Process 3 Step 6-8)
 * - Completing evaluations (Process 3 Step 11-12)
 * - Creating protection strategies (Process 4 Step 1-8)
 * - Approving strategies (Process 4 Step 8)
 * - Creating protection roadmaps (Process 4 Step 9)
 * - Retrieving evaluations with filtering
 * - Getting statistics
 * - Searching evaluations
 * 
 * @module controllers/evaluation.controller
 * @requires ../services/evaluation.service
 * @requires ../middleware/error.middleware
 */

const evaluationService = require('../services/evaluation.service');
const { catchAsync } = require('../middleware/error.middleware');
const logger = require('../logging/logger');

/**
 * Creates a new evaluation for a disclosure.
 * Corresponds to BPS Process 3 Step 1-2.
 * 
 * @route POST /api/v1/evaluations
 * @access Private - TTO Officer, Admin
 */
exports.create = catchAsync(async (req, res) => {
    const { disclosureId, evaluatorId, evaluationType } = req.body;

    if (!disclosureId || !evaluatorId || !evaluationType) {
        return res.status(400).json({
            success: false,
            message: 'Disclosure ID, evaluator ID, and evaluation type are required'
        });
    }

    const evaluation = await evaluationService.createEvaluation(
        disclosureId,
        { evaluatorId, evaluationType },
        req.user.person_id
    );

    res.status(201).json({
        success: true,
        data: evaluation,
        message: 'Evaluation created successfully'
    });
});

/**
 * Adds assessment criteria to an evaluation.
 * Corresponds to BPS Process 3 Step 3-10.
 * 
 * @route POST /api/v1/evaluations/:id/criteria
 * @access Private - TTO Officer, Admin
 */
exports.addCriteria = catchAsync(async (req, res) => {
    const { criteria } = req.body;

    if (!criteria || !Array.isArray(criteria) || criteria.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Criteria array is required'
        });
    }

    const evaluation = await evaluationService.addCriteria(
        req.params.id,
        criteria,
        req.user.person_id
    );

    res.json({
        success: true,
        data: evaluation,
        message: 'Criteria added successfully'
    });
});

/**
 * Records a prior art search.
 * Corresponds to BPS Process 3 Step 6-8.
 * 
 * @route POST /api/v1/evaluations/:id/searches
 * @access Private - TTO Officer, Admin
 */
exports.recordSearch = catchAsync(async (req, res) => {
    const { searchType, searchTerms, searchDatabase, searchResults, relevanceAssessment } = req.body;

    if (!searchType || !searchTerms) {
        return res.status(400).json({
            success: false,
            message: 'Search type and terms are required'
        });
    }

    const evaluation = await evaluationService.recordPriorArtSearch(
        req.params.id,
        { searchType, searchTerms, searchDatabase, searchResults, relevanceAssessment },
        req.user.person_id
    );

    res.json({
        success: true,
        data: evaluation,
        message: 'Prior art search recorded successfully'
    });
});

/**
 * Completes an evaluation with findings and recommendation.
 * Corresponds to BPS Process 3 Step 11-12.
 * 
 * @route POST /api/v1/evaluations/:id/complete
 * @access Private - TTO Officer, Admin
 */
exports.complete = catchAsync(async (req, res) => {
    const { summaryFindings, recommendation, overallScore } = req.body;

    if (!summaryFindings || !recommendation) {
        return res.status(400).json({
            success: false,
            message: 'Summary findings and recommendation are required'
        });
    }

    const evaluation = await evaluationService.completeEvaluation(
        req.params.id,
        { summaryFindings, recommendation, overallScore },
        req.user.person_id
    );

    res.json({
        success: true,
        data: evaluation,
        message: 'Evaluation completed successfully'
    });
});

/**
 * Creates protection strategy recommendations.
 * Corresponds to BPS Process 4 Step 1-8.
 * 
 * @route POST /api/v1/evaluations/:id/strategies
 * @access Private - TTO Officer, Admin
 */
exports.createStrategies = catchAsync(async (req, res) => {
    const { strategies } = req.body;

    if (!strategies || !Array.isArray(strategies) || strategies.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Strategies array is required'
        });
    }

    const evaluation = await evaluationService.createStrategies(
        req.params.id,
        strategies,
        req.user.person_id
    );

    res.json({
        success: true,
        data: evaluation,
        message: 'Protection strategies created successfully'
    });
});

/**
 * Approves a protection strategy.
 * Corresponds to BPS Process 4 Step 8.
 * 
 * @route PATCH /api/v1/strategies/:id/approve
 * @access Private - TTO Officer, Admin
 */
exports.approveStrategy = catchAsync(async (req, res) => {
    const { comments } = req.body;

    const strategy = await evaluationService.approveStrategy(
        req.params.id,
        req.user.person_id,
        comments
    );

    res.json({
        success: true,
        data: strategy,
        message: 'Strategy approved successfully'
    });
});

/**
 * Creates a protection roadmap.
 * Corresponds to BPS Process 4 Step 9.
 * 
 * @route POST /api/v1/evaluations/:id/roadmaps
 * @access Private - TTO Officer, Admin
 */
exports.createRoadmap = catchAsync(async (req, res) => {
    const { roadmapTitle, roadmapDescription, targetFilingDate, estimatedBudget, milestones } = req.body;

    if (!roadmapTitle) {
        return res.status(400).json({
            success: false,
            message: 'Roadmap title is required'
        });
    }

    const evaluation = await evaluationService.createRoadmap(
        req.params.id,
        { roadmapTitle, roadmapDescription, targetFilingDate, estimatedBudget, milestones },
        req.user.person_id
    );

    res.json({
        success: true,
        data: evaluation,
        message: 'Protection roadmap created successfully'
    });
});

/**
 * Gets evaluation by ID.
 * 
 * @route GET /api/v1/evaluations/:id
 * @access Private - TTO Officer, Admin, Executive
 */
exports.findById = catchAsync(async (req, res) => {
    const evaluation = await evaluationService.getEvaluationById(req.params.id);

    if (!evaluation) {
        return res.status(404).json({
            success: false,
            message: 'Evaluation not found'
        });
    }

    res.json({
        success: true,
        data: evaluation
    });
});

/**
 * Gets all evaluations with filtering.
 * 
 * @route GET /api/v1/evaluations
 * @access Private - TTO Officer, Admin, Executive
 */
exports.findAll = catchAsync(async (req, res) => {
    const { status, evaluatorId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (evaluatorId) filters.evaluatorId = evaluatorId;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (limit) filters.limit = parseInt(limit);
    if (page) filters.offset = (parseInt(page) - 1) * parseInt(limit);

    const evaluations = await evaluationService.getEvaluations(filters);

    const statistics = await evaluationService.getStatistics();
    const totalCount = statistics.total_evaluations || evaluations.length;

    res.json({
        success: true,
        data: evaluations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / parseInt(limit))
        }
    });
});

/**
 * Gets evaluations by disclosure.
 * 
 * @route GET /api/v1/evaluations/disclosure/:disclosureId
 * @access Private - TTO Officer, Admin
 */
exports.findByDisclosure = catchAsync(async (req, res) => {
    const { disclosureId } = req.params;
    const evaluations = await evaluationService.getEvaluationsByDisclosure(disclosureId);

    res.json({
        success: true,
        data: evaluations,
        count: evaluations.length
    });
});

/**
 * Gets evaluation statistics.
 * 
 * @route GET /api/v1/evaluations/statistics
 * @access Private - TTO Officer, Admin, Executive
 */
exports.getStatistics = catchAsync(async (req, res) => {
    const statistics = await evaluationService.getStatistics();

    res.json({
        success: true,
        data: statistics
    });
});

/**
 * Updates evaluation status.
 * 
 * @route PATCH /api/v1/evaluations/:id/status
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

    const evaluation = await evaluationService.updateStatus(
        req.params.id,
        status,
        req.user.person_id
    );

    res.json({
        success: true,
        data: evaluation,
        message: `Evaluation status updated to ${status}`
    });
});

/**
 * Approves an evaluation.
 * 
 * @route POST /api/v1/evaluations/:id/approve
 * @access Private - TTO Officer, Admin
 */
exports.approve = catchAsync(async (req, res) => {
    const { ipData } = req.body;

    const evaluation = await evaluationService.approveEvaluation(
        req.params.id,
        req.user.person_id,
        ipData
    );

    res.json({
        success: true,
        data: evaluation,
        message: 'Evaluation approved successfully'
    });
});

/**
 * Searches evaluations.
 * 
 * @route GET /api/v1/evaluations/search
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

    const results = await evaluationService.searchEvaluations(q);

    res.json({
        success: true,
        data: results,
        count: results.length
    });
});