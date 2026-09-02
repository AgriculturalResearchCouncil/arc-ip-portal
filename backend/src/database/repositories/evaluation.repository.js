// src/database/repositories/evaluation.repository.js
/**
 * Technology Evaluation Repository
 * =================================
 * Manages database operations for technology evaluations.
 * Handles:
 * - Evaluation creation and management
 * - Criteria scoring
 * - Prior art search tracking
 * - Protection strategy recommendation
 * - Protection roadmap creation
 * - Evaluation workflow
 * - Statistics and reporting
 * 
 * @module repositories/evaluation.repository
 * @requires ./base.repository
 * @requires ../index
 */

const BaseRepository = require('./base.repository');
const { executeQuery, sql } = require('../index');
const logger = require('../../logging/logger');

/**
 * EvaluationRepository class for managing technology evaluations.
 * Extends BaseRepository with evaluation-specific operations.
 * 
 * @class EvaluationRepository
 * @extends BaseRepository
 */
class EvaluationRepository extends BaseRepository {
    /**
     * Creates an instance of EvaluationRepository.
     * Initializes with the 'technology_evaluations' table and 'evaluation_id' as primary key.
     */
    constructor() {
        super('technology_evaluations', 'evaluation_id');
    }

    /**
     * Finds a complete evaluation with all related data.
     * Includes criteria, prior art searches, protection strategies, and roadmap.
     * 
     * @async
     * @param {string} id - Evaluation UUID
     * @returns {Promise<Object|null>} Complete evaluation object
     */
    async findFullEvaluation(id) {
        if (!id) {
            throw new Error('Evaluation ID is required');
        }

        const query = `
            SELECT 
                te.*,
                d.disclosure_id,
                d.title as disclosure_title,
                d.disclosure_category,
                p.first_name as evaluator_first_name,
                p.last_name as evaluator_last_name,
                p.email as evaluator_email,
                ir.reference_number as ip_reference,
                (
                    SELECT 
                        ec.criterion_id,
                        ec.category,
                        ec.criterion_name,
                        ec.weight,
                        ec.score,
                        ec.comments
                    FROM evaluation_criteria ec
                    WHERE ec.evaluation_id = te.evaluation_id
                    FOR JSON PATH
                ) as criteria,
                (
                    SELECT 
                        ps.search_id,
                        ps.search_type,
                        ps.search_date,
                        ps.search_terms,
                        ps.search_database,
                        ps.search_results,
                        ps.relevance_assessment,
                        pers.first_name + ' ' + pers.last_name as conducted_by_name
                    FROM prior_art_searches ps
                    LEFT JOIN persons pers ON ps.conducted_by = pers.person_id
                    WHERE ps.evaluation_id = te.evaluation_id
                    ORDER BY ps.search_date DESC
                    FOR JSON PATH
                ) as prior_art_searches,
                (
                    SELECT 
                        ps.strategy_id,
                        ps.protection_type,
                        ps.priority,
                        ps.justification,
                        ps.estimated_costs,
                        ps.estimated_timeline,
                        ps.status as strategy_status,
                        pers.first_name + ' ' + pers.last_name as recommended_by_name,
                        approved.first_name + ' ' + approved.last_name as approved_by_name
                    FROM protection_strategies ps
                    LEFT JOIN persons pers ON ps.recommended_by = pers.person_id
                    LEFT JOIN persons approved ON ps.approved_by = approved.person_id
                    WHERE ps.evaluation_id = te.evaluation_id
                    ORDER BY ps.priority ASC
                    FOR JSON PATH
                ) as strategies,
                (
                    SELECT 
                        pr.roadmap_id,
                        pr.roadmap_title,
                        pr.roadmap_description,
                        pr.target_filing_date,
                        pr.estimated_budget,
                        pr.status as roadmap_status,
                        pers.first_name + ' ' + pers.last_name as approved_by_name,
                        (
                            SELECT 
                                rm.milestone_id,
                                rm.milestone_name,
                                rm.milestone_description,
                                rm.target_date,
                                rm.achieved_date,
                                rm.status as milestone_status,
                                rm.order_index
                            FROM roadmap_milestones rm
                            WHERE rm.roadmap_id = pr.roadmap_id
                            ORDER BY rm.order_index ASC
                            FOR JSON PATH
                        ) as milestones
                    FROM protection_roadmaps pr
                    LEFT JOIN persons pers ON pr.approved_by = pers.person_id
                    WHERE pr.evaluation_id = te.evaluation_id
                    FOR JSON PATH
                ) as roadmaps
            FROM technology_evaluations te
            JOIN disclosures d ON te.disclosure_id = d.disclosure_id
            JOIN persons p ON te.evaluator_id = p.person_id
            JOIN ip_records ir ON d.ip_record_id = ir.ip_record_id
            WHERE te.evaluation_id = @id AND te.is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'id', type: sql.UniqueIdentifier, value: id }
        ]);

        if (result.recordset.length === 0) {
            return null;
        }

        const evaluation = result.recordset[0];
        
        // Parse JSON fields
        if (evaluation.criteria) {
            evaluation.criteria = JSON.parse(evaluation.criteria);
        }
        if (evaluation.prior_art_searches) {
            evaluation.prior_art_searches = JSON.parse(evaluation.prior_art_searches);
        }
        if (evaluation.strategies) {
            evaluation.strategies = JSON.parse(evaluation.strategies);
        }
        if (evaluation.roadmaps) {
            evaluation.roadmaps = JSON.parse(evaluation.roadmaps);
            // Parse milestones within roadmaps
            evaluation.roadmaps.forEach(roadmap => {
                if (roadmap.milestones) {
                    roadmap.milestones = JSON.parse(roadmap.milestones);
                }
            });
        }

        return evaluation;
    }

    /**
     * Finds evaluations by disclosure.
     * 
     * @async
     * @param {string} disclosureId - Disclosure UUID
     * @returns {Promise<Array>} Array of evaluations
     */
    async findByDisclosure(disclosureId) {
        if (!disclosureId) {
            throw new Error('Disclosure ID is required');
        }

        const query = `
            SELECT 
                te.*,
                p.first_name + ' ' + p.last_name as evaluator_name,
                COUNT(DISTINCT ec.criterion_id) as criteria_count,
                COUNT(DISTINCT ps.search_id) as search_count
            FROM technology_evaluations te
            JOIN persons p ON te.evaluator_id = p.person_id
            LEFT JOIN evaluation_criteria ec ON ec.evaluation_id = te.evaluation_id
            LEFT JOIN prior_art_searches ps ON ps.evaluation_id = te.evaluation_id
            WHERE te.disclosure_id = @disclosureId AND te.is_deleted = 0
            GROUP BY te.evaluation_id, te.evaluation_type, te.evaluation_date,
                     te.evaluation_status, te.overall_score, te.summary_findings,
                     te.recommendation, te.created_at, te.is_deleted,
                     te.disclosure_id, te.evaluator_id,
                     p.first_name, p.last_name
            ORDER BY te.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'disclosureId', type: sql.UniqueIdentifier, value: disclosureId }
        ]);

        return result.recordset;
    }

    /**
     * Gets evaluation statistics.
     * 
     * @async
     * @returns {Promise<Object>} Evaluation statistics
     */
    async getStatistics() {
        const query = `
            SELECT 
                COUNT(*) as total_evaluations,
                COUNT(CASE WHEN evaluation_status = 'In Progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN evaluation_status = 'Completed' THEN 1 END) as completed,
                COUNT(CASE WHEN evaluation_status = 'Pending Review' THEN 1 END) as pending_review,
                AVG(overall_score) as avg_overall_score,
                MIN(overall_score) as min_score,
                MAX(overall_score) as max_score,
                COUNT(CASE WHEN overall_score >= 4.0 THEN 1 END) as high_scoring,
                COUNT(CASE WHEN overall_score >= 3.0 AND overall_score < 4.0 THEN 1 END) as medium_scoring,
                COUNT(CASE WHEN overall_score < 3.0 THEN 1 END) as low_scoring,
                COUNT(DISTINCT ec.category) as category_count
            FROM technology_evaluations te
            LEFT JOIN evaluation_criteria ec ON ec.evaluation_id = te.evaluation_id
            WHERE te.is_deleted = 0
        `;

        const result = await executeQuery(query);
        return result.recordset[0] || {};
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
        if (!evaluationId || !status) {
            throw new Error('Evaluation ID and status are required');
        }

        let query = `
            UPDATE technology_evaluations
            SET evaluation_status = @status,
                updated_by = @updatedBy,
                updated_at = GETDATE()
        `;

        const params = [
            { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId },
            { name: 'status', value: status },
            { name: 'updatedBy', type: sql.UniqueIdentifier, value: updatedBy }
        ];

        if (status === 'Completed') {
            query += `, evaluation_date = GETDATE()`;
        }

        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                query += `, ${key} = @${key}`;
                params.push({ name: key, value });
            });
        }

        query += ` WHERE evaluation_id = @evaluationId`;

        await executeQuery(query, params);

        logger.info('Evaluation status updated', { evaluationId, status, updatedBy });
        return this.findById(evaluationId);
    }

    /**
     * Calculates overall score from criteria.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @returns {Promise<number>} Calculated overall score
     */
    async calculateOverallScore(evaluationId) {
        if (!evaluationId) {
            throw new Error('Evaluation ID is required');
        }

        const query = `
            SELECT 
                SUM(score * weight) as weighted_sum,
                SUM(weight) as total_weight
            FROM evaluation_criteria
            WHERE evaluation_id = @evaluationId AND is_deleted = 0
        `;

        const result = await executeQuery(query, [
            { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId }
        ]);

        if (result.recordset.length === 0 || result.recordset[0].total_weight === 0) {
            return 0;
        }

        const weightedSum = result.recordset[0].weighted_sum || 0;
        const totalWeight = result.recordset[0].total_weight || 1;

        return parseFloat((weightedSum / totalWeight).toFixed(2));
    }

    /**
     * Gets protection strategy recommendations.
     * 
     * @async
     * @param {string} evaluationId - Evaluation UUID
     * @returns {Promise<Array>} Array of recommended strategies
     */
    async getRecommendedStrategies(evaluationId) {
        if (!evaluationId) {
            throw new Error('Evaluation ID is required');
        }

        const query = `
            SELECT 
                ps.*,
                p.first_name + ' ' + p.last_name as recommended_by_name
            FROM protection_strategies ps
            LEFT JOIN persons p ON ps.recommended_by = p.person_id
            WHERE ps.evaluation_id = @evaluationId
            AND ps.status = 'Pending Approval'
            AND ps.is_deleted = 0
            ORDER BY ps.priority ASC
        `;

        const result = await executeQuery(query, [
            { name: 'evaluationId', type: sql.UniqueIdentifier, value: evaluationId }
        ]);

        return result.recordset;
    }

    /**
     * Approves a protection strategy.
     * 
     * @async
     * @param {string} strategyId - Strategy UUID
     * @param {string} approvedBy - User UUID
     * @param {string} [comments] - Approval comments
     * @returns {Promise<Object>} Updated strategy
     */
    async approveStrategy(strategyId, approvedBy, comments = null) {
        if (!strategyId || !approvedBy) {
            throw new Error('Strategy ID and approver are required');
        }

        const query = `
            UPDATE protection_strategies
            SET status = 'Approved',
                approved_by = @approvedBy,
                approval_date = GETDATE()
            WHERE strategy_id = @strategyId
        `;

        await executeQuery(query, [
            { name: 'strategyId', type: sql.UniqueIdentifier, value: strategyId },
            { name: 'approvedBy', type: sql.UniqueIdentifier, value: approvedBy }
        ]);

        logger.info('Protection strategy approved', { strategyId, approvedBy });
        return this.findById(strategyId);
    }

    /**
     * Gets evaluations by evaluator.
     * 
     * @async
     * @param {string} evaluatorId - Evaluator UUID
     * @returns {Promise<Array>} Array of evaluations
     */
    async findByEvaluator(evaluatorId) {
        if (!evaluatorId) {
            throw new Error('Evaluator ID is required');
        }

        const query = `
            SELECT 
                te.*,
                d.title as disclosure_title,
                d.disclosure_category,
                COUNT(DISTINCT ec.criterion_id) as criteria_count
            FROM technology_evaluations te
            JOIN disclosures d ON te.disclosure_id = d.disclosure_id
            LEFT JOIN evaluation_criteria ec ON ec.evaluation_id = te.evaluation_id
            WHERE te.evaluator_id = @evaluatorId AND te.is_deleted = 0
            GROUP BY te.evaluation_id, te.evaluation_type, te.evaluation_date,
                     te.evaluation_status, te.overall_score, te.summary_findings,
                     te.recommendation, te.created_at, te.is_deleted,
                     te.disclosure_id, te.evaluator_id,
                     d.title, d.disclosure_category
            ORDER BY te.created_at DESC
        `;

        const result = await executeQuery(query, [
            { name: 'evaluatorId', type: sql.UniqueIdentifier, value: evaluatorId }
        ]);

        return result.recordset;
    }
}

module.exports = new EvaluationRepository();