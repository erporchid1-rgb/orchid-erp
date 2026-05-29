const express = require('express');
const { body } = require('express-validator');
const suppliersController = require('./suppliers.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/', suppliersController.getAll);
router.get('/:id', suppliersController.getById);
router.get('/:id/purchases', suppliersController.getPurchaseHistory);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'), [
  body('supplierName').trim().notEmpty().withMessage('Supplier name is required'),
  body('mobile').notEmpty().withMessage('Mobile number is required'),
], suppliersController.create);
router.put('/:id', requireRole('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'), suppliersController.update);
router.delete('/:id', requireRole('ADMIN'), suppliersController.remove);

module.exports = router;
