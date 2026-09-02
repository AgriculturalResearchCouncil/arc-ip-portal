// src/routes/trademark.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const trademarkController = require('../controllers/trademark.controller');

router.use(authenticate);

router.post('/', authorize('TTO Officer', 'Admin'), trademarkController.create);
router.get('/', authorize('TTO Officer', 'Admin', 'Executive'), trademarkController.findAll);
router.get('/statistics', authorize('TTO Officer', 'Admin', 'Executive'), trademarkController.getStatistics);
router.get('/expiring', authorize('TTO Officer', 'Admin'), trademarkController.getExpiringSoon);
router.get('/search', authorize('TTO Officer', 'Admin'), trademarkController.search);
router.get('/registration/:number', authorize('TTO Officer', 'Admin'), trademarkController.findByRegistrationNumber);
router.get('/:id', authorize('TTO Officer', 'Admin', 'Executive'), trademarkController.findById);
router.patch('/:id/status', authorize('TTO Officer', 'Admin'), trademarkController.updateStatus);
router.post('/:id/renewals', authorize('TTO Officer', 'Admin'), trademarkController.recordRenewal);

module.exports = router;