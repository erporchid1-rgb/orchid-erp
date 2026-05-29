const express = require('express');
const indentsController = require('./indents.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/', indentsController.getAll);
router.get('/:id', indentsController.getById);
router.post('/', indentsController.create);
router.patch('/:id/approve', requireRole('ADMIN', 'STORE_MANAGER'), indentsController.approve);
router.patch('/:id/reject', requireRole('ADMIN', 'STORE_MANAGER'), indentsController.reject);

module.exports = router;
