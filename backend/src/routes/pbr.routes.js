// src/routes/pbr.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const pbrController = require('../controllers/pbr.controller');

router.use(authenticate);

router.post('/', authorize('TTO Officer', 'Admin'), pbrController.create);
router.get('/', authorize('TTO Officer', 'Admin', 'Executive'), pbrController.findAll);
router.get('/statistics', authorize('TTO Officer', 'Admin', 'Executive'), pbrController.getStatistics);
router.get('/expiring', authorize('TTO Officer', 'Admin'), pbrController.getExpiringSoon);
router.get('/search', authorize('TTO Officer', 'Admin'), pbrController.search);
router.get('/application/:number', authorize('TTO Officer', 'Admin'), pbrController.findByApplicationNumber);
router.get('/:id', authorize('TTO Officer', 'Admin', 'Executive'), pbrController.findById);
router.patch('/:id/status', authorize('TTO Officer', 'Admin'), pbrController.updateStatus);
router.post('/:id/renewals', authorize('TTO Officer', 'Admin'), pbrController.recordRenewal);

module.exports = router;