const express = require('express');
const { body } = require('express-validator');
const purchasesController = require('./purchases.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');
const upload = require('../../middleware/upload');

const router = express.Router();
router.use(authenticate);

const itemValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.materialId').notEmpty().withMessage('Material is required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('items.*.rate').isFloat({ gt: 0 }).withMessage('Rate must be greater than 0'),
  body('supplierId').notEmpty().withMessage('Supplier is required'),
  body('purchaseDate').isISO8601().withMessage('Valid purchase date is required'),
];

router.get('/', purchasesController.getAll);
router.get('/:id', purchasesController.getById);
router.get('/:id/pdf', purchasesController.generatePDF);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'), itemValidation, purchasesController.create);
router.patch('/:id/status', purchasesController.updateStatus);  // role-checked in controller
router.patch('/:id/submit', requireRole('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'), purchasesController.submitForApproval);
router.patch('/:id/approve', requireRole('ADMIN'), purchasesController.approvePurchase);
router.patch('/:id/reject', requireRole('ADMIN'), purchasesController.rejectPurchase);
router.post('/:id/quotation/:num', requireRole('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'), upload.single('file'), purchasesController.uploadQuotation);
router.post('/:id/invoice', requireRole('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'), upload.single('invoice'), purchasesController.uploadInvoice);
router.delete('/:id', requireRole('ADMIN', 'STORE_MANAGER'), purchasesController.remove);

module.exports = router;
