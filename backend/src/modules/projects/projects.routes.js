const express = require('express');
const { body } = require('express-validator');
const projectsController = require('./projects.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

const validation = [
  body('projectName').trim().notEmpty().withMessage('Project name is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('projectType').optional().isIn(['THREE_BHK', 'FOUR_BHK', 'COMMERCIAL', 'OTHER']),
  body('status').optional().isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']),
];

router.get('/', projectsController.getAll);
router.get('/:id', projectsController.getById);
router.get('/:id/stats', projectsController.getStats);
router.post('/', requireRole('ADMIN', 'STORE_MANAGER'), validation, projectsController.create);
router.put('/:id', requireRole('ADMIN', 'STORE_MANAGER'), projectsController.update);
router.delete('/:id', requireRole('ADMIN'), projectsController.remove);

module.exports = router;
