const express = require('express');
const { body } = require('express-validator');
const sitesController = require('./sites.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/', sitesController.getAll);
router.get('/by-project/:projectId', sitesController.getByProject);
router.get('/:id', sitesController.getById);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER'), [
  body('siteName').trim().notEmpty().withMessage('Site name is required'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
], sitesController.create);
router.put('/:id', requireRole('ADMIN', 'STORE_MANAGER'), sitesController.update);
router.delete('/:id', requireRole('ADMIN'), sitesController.remove);

module.exports = router;
