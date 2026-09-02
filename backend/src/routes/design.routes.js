// src/routes/design.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const designController = require('../controllers/design.controller');

router.use(authenticate);

router.post('/', authorize('TTO Officer', 'Admin'), designController.create);
router.get('/', authorize('TTO Officer', 'Admin', 'Executive'), designController.findAll);
router.get('/statistics', authorize('TTO Officer', 'Admin', 'Executive'), designController.getStatistics);
router.get('/expiring', authorize('TTO Officer', 'Admin'), designController.getExpiringSoon);
router.get('/search', authorize('TTO Officer', 'Admin'), designController.search);
router.get('/registration/:number', authorize('TTO Officer', 'Admin'), designController.findByRegistrationNumber);
router.get('/type/:type', authorize('TTO Officer', 'Admin'), designController.findByType);
router.get('/:id', authorize('TTO Officer', 'Admin', 'Executive'), designController.findById);
router.patch('/:id/status', authorize('TTO Officer', 'Admin'), designController.updateStatus);
router.post('/:id/renewals', authorize('TTO Officer', 'Admin'), designController.recordRenewal);

module.exports = router;