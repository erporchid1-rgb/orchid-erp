const express = require('express');
const { body } = require('express-validator');
const materialsController = require('./materials.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/categories', materialsController.getCategories);
router.post('/categories', requireRole('ADMIN', 'STORE_MANAGER'), [
  body('name').trim().notEmpty().withMessage('Category name is required'),
], materialsController.createCategory);

router.get('/', materialsController.getAll);
router.get('/:id', materialsController.getById);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER'), [
  body('materialName').trim().notEmpty().withMessage('Material name is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('unit').notEmpty().withMessage('Unit is required'),
], materialsController.create);
router.put('/:id', requireRole('ADMIN', 'STORE_MANAGER'), materialsController.update);
router.delete('/:id', requireRole('ADMIN'), materialsController.remove);

module.exports = router;
