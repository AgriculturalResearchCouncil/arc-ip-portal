// src/routes/trade-secret.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const tradeSecretController = require('../controllers/trade-secret.controller');

router.use(authenticate);

router.post('/', authorize('TTO Officer', 'Admin'), tradeSecretController.create);
router.get('/', authorize('TTO Officer', 'Admin', 'Executive'), tradeSecretController.findAll);
router.get('/statistics', authorize('TTO Officer', 'Admin', 'Executive'), tradeSecretController.getStatistics);
router.get('/search', authorize('TTO Officer', 'Admin'), tradeSecretController.search);
router.get('/clearance/:level', authorize('TTO Officer', 'Admin'), tradeSecretController.findByClearanceLevel);
router.get('/:id', authorize('TTO Officer', 'Admin', 'Executive'), tradeSecretController.findById);
router.patch('/:id/status', authorize('TTO Officer', 'Admin'), tradeSecretController.updateStatus);
router.post('/:id/ndas', authorize('TTO Officer', 'Admin'), tradeSecretController.recordNda);
router.post('/:id/clearances', authorize('TTO Officer', 'Admin'), tradeSecretController.grantClearance);

module.exports = router;