const express = require('express');
const { body } = require('express-validator');
const usersController = require('./users.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['ADMIN', 'STORE_MANAGER', 'SITE_ENGINEER', 'ACCOUNTANT']).withMessage('Invalid role'),
  body('mobile').optional().isMobilePhone().withMessage('Invalid mobile number'),
];

router.get('/', requireRole('ADMIN', 'STORE_MANAGER'), usersController.getAll);
router.get('/:id', requireRole('ADMIN', 'STORE_MANAGER'), usersController.getById);
router.post('/', requireRole('ADMIN'), createValidation, usersController.create);
router.put('/:id', requireRole('ADMIN'), usersController.update);
router.delete('/:id', requireRole('ADMIN'), usersController.remove);

module.exports = router;
