const express = require('express');
const { body } = require('express-validator');
const issuesController = require('./issues.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/', issuesController.getAll);
router.get('/:id', issuesController.getById);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER', 'SITE_ENGINEER'), [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.materialId').notEmpty().withMessage('Material is required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('issuedTo').trim().notEmpty().withMessage('Issued to is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
], issuesController.create);
router.patch('/:id/approve', requireRole('ADMIN', 'STORE_MANAGER'), issuesController.approve);
router.patch('/:id/reject', requireRole('ADMIN', 'STORE_MANAGER'), issuesController.reject);

module.exports = router;
