// src/routes/copyright.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const copyrightController = require('../controllers/copyright.controller');

router.use(authenticate);

router.post('/', authorize('TTO Officer', 'Admin'), copyrightController.create);
router.get('/', authorize('TTO Officer', 'Admin', 'Executive'), copyrightController.findAll);
router.get('/statistics', authorize('TTO Officer', 'Admin', 'Executive'), copyrightController.getStatistics);
router.get('/search', authorize('TTO Officer', 'Admin'), copyrightController.search);
router.get('/registration/:number', authorize('TTO Officer', 'Admin'), copyrightController.findByRegistrationNumber);
router.get('/author/:personId', authorize('TTO Officer', 'Admin'), copyrightController.findByAuthor);
router.get('/type/:workType', authorize('TTO Officer', 'Admin'), copyrightController.findByWorkType);
router.get('/:id', authorize('TTO Officer', 'Admin', 'Executive'), copyrightController.findById);
router.patch('/:id/status', authorize('TTO Officer', 'Admin'), copyrightController.updateStatus);

module.exports = router;