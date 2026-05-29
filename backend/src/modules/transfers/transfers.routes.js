const express = require('express');
const { body } = require('express-validator');
const transfersController = require('./transfers.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/', transfersController.getAll);
router.get('/:id', transfersController.getById);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER'), [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.materialId').notEmpty().withMessage('Material is required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('transferDate').isISO8601().withMessage('Valid transfer date is required'),
], transfersController.create);

module.exports = router;
