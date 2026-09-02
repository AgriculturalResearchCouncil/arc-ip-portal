// src/services/evaluation.service.js
/**
 * Technology Evaluation Service
 * =============================
 * Business logic layer for technology evaluations.
 * Handles BPS Process 3 (Assessment) and Process 4 (IP Strategy Decision).
 * 
 * Process 3: Assessment and Prior Art Review
 * - TTO receives disclosure
 * - Assigns reviewer
 * - Assesses documentation completeness
 * - Verifies inventorship and funding
 * - Performs patent, literature, and market searches
 * - Evaluates novelty and commercial value
 * - Prepares assessment report
 * - Issues recommendation
 * 
 * Process 4: IP Strategy Decision
 * - Reviews assessment findings
 * - Reviews prior art results
 * - Assesses commercialization potential
 * - Assesses protection costs
 * - Determines protection viability
 * - Decides whether to protect
 * - Selects protection type
 * - Approves strategy
 * - Creates protection roadmap
 * 
 * @module services/evaluation.service
 * @requires ../database/repositories/evaluation.repository
 * @requires ../database/repositories/disclosure.repository
 * @requires ../database/repositories/ip-record.repository
 * @requires ../errors/app-error
 * @requires ../logging/logger
 * @requires uuid
 */

const evaluationRepository = require('../database/repositories/evaluation.repository');
const disclosureRepository = require('../database/repositories/disclosure.repository');
const ipRecordRepository = require('../database/repositories/ip-record.repository');
const personRepository = require('../database/repositories/person.repository');
const { ValidationError, NotFoundError, ForbiddenError } = require('../errors/app-error');
const logger = require('../logging/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * EvaluationService class containing all evaluation business logic.
 * 
 * @class EvaluationService
 */
class EvaluationService {
    /**
     * Creates a new technology evaluation for a disclosure.
     * Corresponds to BPS Process 3 Step 1-2: TTO receives disclosure and assigns reviewer.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @param {Object} data - Evaluation data
     * @param {string} data.evaluatorId - Evaluator UUID (required)
     * @param {string} data.evaluationType - Evaluation type (required)
     * @param {string} createdBy - User UUID
     * @returns {Promise<Object>} Created evaluation
     * @throws {ValidationError} If required fields are missing
     * @throws {NotFoundError} If disclosure not found
     * @throws {ForbiddenError} If disclosure not ready for evaluation
     */
    async createEvaluation(disclosureId, data, createdBy) {
        try {
            // Validate required fields
            if (!data.evaluatorId || !data.evaluationType) {
                throw new ValidationError('Missing required fields', {
                    required: ['evaluatorId', 'evaluationType'],
                    provided: Object.keys(data)
                });
            }

            // Verify disclosure exists
            const disclosure = await disclosureRepository.findById(disclosureId);
            if (!disclosure) {
                throw new NotFoundError('Disclosure not found', { disclosureId });
            }

            // Check if disclosure is ready for evaluation
            if (disclosure.review_status !== 'Submitted' && disclosure.review_status !== 'Under Review') {
                throw new ForbiddenError(
                    'Disclosure must be in Submitted or Under Review status for evaluation',
                    {
                        disclosureId,
                        currentStatus: disclosure.review_status
                    }
                );
            }

            // Verify evaluator exists
            const evaluator = await personRepository.findById(data.evaluatorId);
            if (!evaluator) {
                throw new NotFoundError('Evaluator not found', { evaluatorId: data.evaluatorId });
            }

            // Create evaluation
            const evaluationId = uuidv4();
            const evaluationData = {
                evaluation_id: evaluationId,
                disclosure_id: disclosureId,
                evaluation_type: data.evaluationType,
                evaluator_id: data.evaluatorId,
                evaluation_status: 'In Progress',
                created_by: createdBy,
            };

            const evaluation = await evaluationRepository.create(evaluationData);

            // Update disclosure status
            await disclosureRepository.update(disclosureId, {
                review_status: 'Under Review',
                reviewed_by: data.evaluatorId,
            });

            logger.logAudit('EVALUATION_CREATED', createdBy, {
                evaluationId,
                disclosureId,
                evaluatorId: data.evaluatorId
            });

            return evaluation;
        } catch (error) {
            logger.error('Error creating evaluation:', error);
            throw error;
        }
    }

    /**
     * Adds assessment criteria to an evaluation.
     * Corresponds to BPS Process 3 Step 3-10: Assessment activities.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {Array} criteria - Array of criterion objects
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated evaluation
     */
    async addCriteria(evaluationId, criteria, updatedBy) {
        const { executeQuery, sql } = require('../database');

        // Verify evaluation exists
        const evaluation = await evaluationRepository.findById(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        const validCategories = ['Technical', 'IP', 'Commercial', 'Strategic'];
        
        for (const criterion of criteria) {
            if (!criterion.category || !criterion.criterionName) {
                throw new ValidationError('Criterion requires category and name', { criterion });
            }

            if (!validCategories.includes(criterion.category)) {
                throw new ValidationError('Invalid criterion category', {
                    category: criterion.category,
                    validCategories
                });
            }

            const criterionId = uuidv4();
            const query = `
                INSERT INTO evaluation_criteria (
                    criterion_id,
                    evaluation_id,
                    category,
                    criterion_name,
                    weight,
                    score,
                    comments,
                    created_at
                ) VALUES (
                    @criterionId,
                    @evaluationId,
                    @category,
                    @criterionName,
                    @weight,
                    @score,
                    @comments,
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'criterionId', type: sql.UniqueIdentifier, value: criterionId },
                { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId },
                { name: 'category', value: criterion.category },
                { name: 'criterionName', value: criterion.criterionName },
                { name: 'weight', value: criterion.weight || 1.0 },
                { name: 'score', value: criterion.score || null },
                { name: 'comments', value: criterion.comments || null },
            ]);
        }

        // Recalculate overall score
        await this.updateOverallScore(evaluationId);

        logger.logAudit('CRITERIA_ADDED', updatedBy, {
            evaluationId,
            criteriaCount: criteria.length
        });

        return await evaluationRepository.findFullEvaluation(evaluationId);
    }

    /**
     * Records a prior art search.
     * Corresponds to BPS Process 3 Step 6-8: Patent, literature, and market searches.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {Object} searchData - Search data
     * @param {string} searchData.searchType - Search type (Patent, Literature, Market)
     * @param {string} searchData.searchTerms - Search terms
     * @param {string} [searchData.searchDatabase] - Search database
     * @param {string} [searchData.searchResults] - Search results
     * @param {string} [searchData.relevanceAssessment] - Relevance assessment
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Created search record
     */
    async recordPriorArtSearch(evaluationId, searchData, updatedBy) {
        const { executeQuery, sql } = require('../database');

        // Verify evaluation exists
        const evaluation = await evaluationRepository.findById(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        // Validate search data
        if (!searchData.searchType || !searchData.searchTerms) {
            throw new ValidationError('Search requires type and terms', {
                required: ['searchType', 'searchTerms'],
                provided: Object.keys(searchData)
            });
        }

        const validTypes = ['Patent', 'Literature', 'Market'];
        if (!validTypes.includes(searchData.searchType)) {
            throw new ValidationError('Invalid search type', {
                searchType: searchData.searchType,
                validTypes
            });
        }

        const searchId = uuidv4();
        const query = `
            INSERT INTO prior_art_searches (
                search_id,
                evaluation_id,
                search_type,
                search_date,
                search_terms,
                search_database,
                search_results,
                relevance_assessment,
                conducted_by,
                created_at
            ) VALUES (
                @searchId,
                @evaluationId,
                @searchType,
                GETDATE(),
                @searchTerms,
                @searchDatabase,
                @searchResults,
                @relevanceAssessment,
                @conductedBy,
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'searchId', type: sql.UniqueIdentifier, value: searchId },
            { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId },
            { name: 'searchType', value: searchData.searchType },
            { name: 'searchTerms', value: searchData.searchTerms },
            { name: 'searchDatabase', value: searchData.searchDatabase || null },
            { name: 'searchResults', value: searchData.searchResults || null },
            { name: 'relevanceAssessment', value: searchData.relevanceAssessment || null },
            { name: 'conductedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ]);

        logger.logAudit('PRIOR_ART_SEARCH_RECORDED', updatedBy, {
            evaluationId,
            searchId,
            searchType: searchData.searchType
        });

        return await evaluationRepository.findFullEvaluation(evaluationId);
    }

    /**
     * Completes an evaluation with findings and recommendation.
     * Corresponds to BPS Process 3 Step 11-12: Prepares report and issues recommendation.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {Object} data - Completion data
     * @param {string} data.summaryFindings - Summary findings
     * @param {string} data.recommendation - Recommendation
     * @param {number} [data.overallScore] - Overall score
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Completed evaluation
     */
    async completeEvaluation(evaluationId, data, updatedBy) {
        // Verify evaluation exists
        const evaluation = await evaluationRepository.findById(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        // Validate completion data
        if (!data.summaryFindings || !data.recommendation) {
            throw new ValidationError('Summary findings and recommendation are required', {
                required: ['summaryFindings', 'recommendation'],
                provided: Object.keys(data)
            });
        }

        // Calculate overall score if not provided
        let overallScore = data.overallScore;
        if (!overallScore) {
            overallScore = await evaluationRepository.calculateOverallScore(evaluationId);
        }

        // Update evaluation
        const updated = await evaluationRepository.update(evaluationId, {
            summary_findings: data.summaryFindings,
            recommendation: data.recommendation,
            overall_score: overallScore,
            evaluation_status: 'Completed',
            evaluation_date: new Date(),
            updated_by: updatedBy,
        });

        // Update disclosure
        await disclosureRepository.update(evaluation.disclosure_id, {
            review_status: 'Reviewed',
        });

        logger.logAudit('EVALUATION_COMPLETED', updatedBy, {
            evaluationId,
            overallScore,
            recommendation: data.recommendation
        });

        return updated;
    }

    /**
     * Creates protection strategy recommendations.
     * Corresponds to BPS Process 4 Step 1-8: Strategy decision activities.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {Array} strategies - Array of strategy objects
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Updated evaluation
     */
    async createStrategies(evaluationId, strategies, updatedBy) {
        const { executeQuery, sql } = require('../database');

        // Verify evaluation exists and is completed
        const evaluation = await evaluationRepository.findById(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        if (evaluation.evaluation_status !== 'Completed') {
            throw new ForbiddenError(
                'Evaluation must be completed before creating strategies',
                {
                    evaluationId,
                    currentStatus: evaluation.evaluation_status
                }
            );
        }

        const validProtectionTypes = ['Patent', 'PBR', 'Trademark', 'Copyright', 'Trade Secret', 'Design'];

        for (const strategy of strategies) {
            if (!strategy.protectionType || !strategy.justification) {
                throw new ValidationError('Strategy requires protection type and justification', {
                    strategy
                });
            }

            if (!validProtectionTypes.includes(strategy.protectionType)) {
                throw new ValidationError('Invalid protection type', {
                    protectionType: strategy.protectionType,
                    validProtectionTypes
                });
            }

            const strategyId = uuidv4();
            const query = `
                INSERT INTO protection_strategies (
                    strategy_id,
                    evaluation_id,
                    protection_type,
                    priority,
                    justification,
                    estimated_costs,
                    estimated_timeline,
                    recommended_by,
                    status,
                    created_at
                ) VALUES (
                    @strategyId,
                    @evaluationId,
                    @protectionType,
                    @priority,
                    @justification,
                    @estimatedCosts,
                    @estimatedTimeline,
                    @recommendedBy,
                    'Pending Approval',
                    GETDATE()
                )
            `;

            await executeQuery(query, [
                { name: 'strategyId', type: sql.UniqueIdentifier, value: strategyId },
                { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId },
                { name: 'protectionType', value: strategy.protectionType },
                { name: 'priority', value: strategy.priority || 1 },
                { name: 'justification', value: strategy.justification },
                { name: 'estimatedCosts', value: strategy.estimatedCosts || null },
                { name: 'estimatedTimeline', value: strategy.estimatedTimeline || null },
                { name: 'recommendedBy', type: sql.UniqueIdentifier, value: updatedBy }
            ]);
        }

        logger.logAudit('STRATEGIES_CREATED', updatedBy, {
            evaluationId,
            strategyCount: strategies.length
        });

        return await evaluationRepository.findFullEvaluation(evaluationId);
    }

    /**
     * Approves a protection strategy.
     * Corresponds to BPS Process 4 Step 8: Approve strategy.
     * 
     * @async
     * @param {string} strategyId - Strategy UUID
     * @param {string} approvedBy - User UUID
     * @param {string} [comments] - Approval comments
     * @returns {Promise<Object>} Approved strategy
     */
    async approveStrategy(strategyId, approvedBy, comments = null) {
        const { executeQuery } = require('../database');

        // Check if strategy exists
        const query = `
            SELECT * FROM protection_strategies
            WHERE strategy_id = @strategyId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'strategyId', type: sql.UniqueIdentifier, value: strategyId }
        ]);

        if (result.recordset.length === 0) {
            throw new NotFoundError('Strategy not found', { strategyId });
        }

        const strategy = result.recordset[0];
        if (strategy.status !== 'Pending Approval') {
            throw new ForbiddenError('Strategy is not pending approval', {
                strategyId,
                currentStatus: strategy.status
            });
        }

        const approved = await evaluationRepository.approveStrategy(strategyId, approvedBy);

        logger.logAudit('STRATEGY_APPROVED', approvedBy, {
            strategyId,
            protectionType: strategy.protection_type
        });

        return approved;
    }

    /**
     * Creates a protection roadmap.
     * Corresponds to BPS Process 4 Step 9: Create protection roadmap.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {Object} roadmapData - Roadmap data
     * @param {string} roadmapData.roadmapTitle - Roadmap title (required)
     * @param {string} [roadmapData.roadmapDescription] - Roadmap description
     * @param {string} [roadmapData.targetFilingDate] - Target filing date
     * @param {number} [roadmapData.estimatedBudget] - Estimated budget
     * @param {Array} [roadmapData.milestones] - Array of milestone objects
     * @param {string} updatedBy - User UUID
     * @returns {Promise<Object>} Created roadmap
     */
    async createRoadmap(evaluationId, roadmapData, updatedBy) {
        const { executeQuery, sql } = require('../database');

        // Verify evaluation exists and is completed
        const evaluation = await evaluationRepository.findById(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        if (evaluation.evaluation_status !== 'Completed') {
            throw new ForbiddenError(
                'Evaluation must be completed before creating a roadmap',
                {
                    evaluationId,
                    currentStatus: evaluation.evaluation_status
                }
            );
        }

        // Validate roadmap data
        if (!roadmapData.roadmapTitle) {
            throw new ValidationError('Roadmap title is required', {
                required: ['roadmapTitle'],
                provided: Object.keys(roadmapData)
            });
        }

        // Create roadmap
        const roadmapId = uuidv4();
        const query = `
            INSERT INTO protection_roadmaps (
                roadmap_id,
                evaluation_id,
                roadmap_title,
                roadmap_description,
                target_filing_date,
                estimated_budget,
                status,
                created_at
            ) VALUES (
                @roadmapId,
                @evaluationId,
                @roadmapTitle,
                @roadmapDescription,
                @targetFilingDate,
                @estimatedBudget,
                'Draft',
                GETDATE()
            )
        `;

        await executeQuery(query, [
            { name: 'roadmapId', type: sql.UniqueIdentifier, value: roadmapId },
            { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId },
            { name: 'roadmapTitle', value: roadmapData.roadmapTitle },
            { name: 'roadmapDescription', value: roadmapData.roadmapDescription || null },
            { name: 'targetFilingDate', value: roadmapData.targetFilingDate || null },
            { name: 'estimatedBudget', value: roadmapData.estimatedBudget || null }
        ]);

        // Add milestones if provided
        if (roadmapData.milestones && roadmapData.milestones.length > 0) {
            for (const milestone of roadmapData.milestones) {
                if (!milestone.milestoneName) {
                    throw new ValidationError('Milestone requires name', { milestone });
                }

                const milestoneId = uuidv4();
                const milestoneQuery = `
                    INSERT INTO roadmap_milestones (
                        milestone_id,
                        roadmap_id,
                        milestone_name,
                        milestone_description,
                        target_date,
                        status,
                        order_index,
                        created_at
                    ) VALUES (
                        @milestoneId,
                        @roadmapId,
                        @milestoneName,
                        @milestoneDescription,
                        @targetDate,
                        'Planned',
                        @orderIndex,
                        GETDATE()
                    )
                `;

                await executeQuery(milestoneQuery, [
                    { name: 'milestoneId', type: sql.UniqueIdentifier, value: milestoneId },
                    { name: 'roadmapId', type: sql.UniqueIdentifier, value: roadmapId },
                    { name: 'milestoneName', value: milestone.milestoneName },
                    { name: 'milestoneDescription', value: milestone.milestoneDescription || null },
                    { name: 'targetDate', value: milestone.targetDate || null },
                    { name: 'orderIndex', value: milestone.orderIndex || 0 }
                ]);
            }
        }

        logger.logAudit('ROADMAP_CREATED', updatedBy, {
            evaluationId,
            roadmapId,
            roadmapTitle: roadmapData.roadmapTitle
        });

        return await evaluationRepository.findFullEvaluation(evaluationId);
    }

    /**
     * Updates overall score for an evaluation.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @returns {Promise<number>} Updated overall score
     * @private
     */
    async updateOverallScore(evaluationId) {
        const overallScore = await evaluationRepository.calculateOverallScore(evaluationId);
        
        await evaluationRepository.update(evaluationId, {
            overall_score: overallScore
        });

        return overallScore;
    }

    /**
     * Gets evaluation by ID with full details.
     * 
     * @async
     * @param {string} id - Evaluation UUID
     * @returns {Promise<Object|null>} Full evaluation details
     */
    async getEvaluationById(id) {
        return await evaluationRepository.findFullEvaluation(id);
    }

    /**
     * Gets evaluations by disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @returns {Promise<Array>} Array of evaluations
     */
    async getEvaluationsByDisclosure(disclosureId) {
        return await evaluationRepository.findByDisclosure(disclosureId);
    }

    /**
     * Gets evaluation statistics.
     * 
     * @async
     * @returns {Promise<Object>} Evaluation statistics
     */
    async getStatistics() {
        return await evaluationRepository.getStatistics();
    }

    /**
     * Gets all evaluations with filtering.
     * 
     * @async
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Evaluation status
     * @param {string} [filters.evaluatorId] - Evaluator filter
     * @param {string} [filters.dateFrom] - From date
     * @param {string} [filters.dateTo] - To date
     * @param {number} [filters.limit] - Limit results
     * @param {number} [filters.offset] - Offset for pagination
     * @returns {Promise<Array>} Array of evaluations
     */
    async getEvaluations(filters = {}) {
        const { executeQuery } = require('../database');

        let query = `
            SELECT 
                te.*,
                d.title as disclosure_title,
                d.disclosure_category,
                p.first_name + ' ' + p.last_name as evaluator_name,
                COUNT(DISTINCT ec.criterion_id) as criteria_count,
                COUNT(DISTINCT ps.search_id) as search_count,
                COUNT(DISTINCT ps2.strategy_id) as strategy_count
            FROM technology_evaluations te
            JOIN disclosures d ON te.disclosure_id = d.disclosure_id
            JOIN persons p ON te.evaluator_id = p.person_id
            LEFT JOIN evaluation_criteria ec ON ec.evaluation_id = te.evaluation_id
            LEFT JOIN prior_art_searches ps ON ps.evaluation_id = te.evaluation_id
            LEFT JOIN protection_strategies ps2 ON ps2.evaluation_id = te.evaluation_id
            WHERE te.is_deleted = 0
        `;

        const params = [];

        if (filters.status) {
            query += ` AND te.evaluation_status = @status`;
            params.push({ name: 'status', value: filters.status });
        }

        if (filters.evaluatorId) {
            query += ` AND te.evaluator_id = @evaluatorId`;
            params.push({ name: 'evaluatorId', type: sql.UniqueIdentifier, value: filters.evaluatorId });
        }

        if (filters.dateFrom) {
            query += ` AND te.created_at >= @dateFrom`;
            params.push({ name: 'dateFrom', value: filters.dateFrom });
        }

        if (filters.dateTo) {
            query += ` AND te.created_at <= @dateTo`;
            params.push({ name: 'dateTo', value: filters.dateTo });
        }

        query += `
            GROUP BY te.evaluation_id, te.disclosure_id, te.evaluation_type,
                     te.evaluation_date, te.evaluation_status, te.overall_score,
                     te.summary_findings, te.recommendation, te.created_at,
                     te.is_deleted, te.evaluator_id,
                     d.title, d.disclosure_category,
                     p.first_name, p.last_name
            ORDER BY te.created_at DESC
        `;

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ` OFFSET ${offset} ROWS FETCH NEXT ${filters.limit} ROWS ONLY`;
        }

        const result = await executeQuery(query, params);
        return result.recordset;
    }

    /**
     * Updates evaluation status.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {string} status - New status
     * @param {string} updatedBy - User UUID
     * @param {Object} [metadata] - Additional metadata
     * @returns {Promise<Object>} Updated evaluation
     */
    async updateStatus(evaluationId, status, updatedBy, metadata = null) {
        const evaluation = await evaluationRepository.findById(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        const validStatuses = ['In Progress', 'Pending Review', 'Completed'];
        if (!validStatuses.includes(status)) {
            throw new ValidationError('Invalid evaluation status', {
                status,
                validStatuses
            });
        }

        return await evaluationRepository.updateStatus(evaluationId, status, updatedBy, metadata);
    }

    /**
     * Approves evaluation and creates IP record.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @param {string} approvedBy - User UUID
     * @param {Object} [ipData] - Optional IP record data
     * @returns {Promise<Object>} Approved evaluation
     */
    async approveEvaluation(evaluationId, approvedBy, ipData = null) {
        const evaluation = await evaluationRepository.findFullEvaluation(evaluationId);
        if (!evaluation) {
            throw new NotFoundError('Evaluation not found', { evaluationId });
        }

        if (evaluation.evaluation_status !== 'Completed') {
            throw new ForbiddenError(
                'Evaluation must be completed before approval',
                {
                    evaluationId,
                    currentStatus: evaluation.evaluation_status
                }
            );
        }

        // Update evaluation status
        const updated = await evaluationRepository.updateStatus(
            evaluationId,
            'Approved',
            approvedBy
        );

        // Create IP record if data provided
        if (ipData) {
            const disclosure = await disclosureRepository.findById(evaluation.disclosure_id);
            if (disclosure) {
                // Update IP record status
                await ipRecordRepository.updateStatus(
                    disclosure.ip_record_id,
                    'Approved for Protection',
                    approvedBy
                );
            }
        }

        logger.logAudit('EVALUATION_APPROVED', approvedBy, {
            evaluationId,
            recommendation: evaluation.recommendation
        });

        return updated;
    }

    /**
     * Searches evaluations by keyword.
     * 
     * @async
     * @param {string} searchQuery - Search term
     * @returns {Promise<Array>} Array of matching evaluations
     */
    async searchEvaluations(searchQuery) {
        if (!searchQuery || searchQuery.length < 2) {
            return [];
        }

        const { executeQuery } = require('../database');
        const searchTerm = `%${searchQuery}%`;
        const query = `
            SELECT 
                te.evaluation_id,
                te.evaluation_type,
                te.evaluation_status,
                te.overall_score,
                te.created_at,
                d.title as disclosure_title,
                p.first_name + ' ' + p.last_name as evaluator_name
            FROM technology_evaluations te
            JOIN disclosures d ON te.disclosure_id = d.disclosure_id
            JOIN persons p ON te.evaluator_id = p.person_id
            WHERE te.is_deleted = 0
            AND (
                d.title LIKE @searchTerm
                OR te.summary_findings LIKE @searchTerm
                OR te.recommendation LIKE @searchTerm
                OR p.first_name LIKE @searchTerm
                OR p.last_name LIKE @searchTerm
            )
            ORDER BY te.created_at DESC
            OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
        `;

        const result = await executeQuery(query, [
            { name: 'searchTerm', value: searchTerm }
        ]);

        return result.recordset;
    }
}

module.exports = new EvaluationService();