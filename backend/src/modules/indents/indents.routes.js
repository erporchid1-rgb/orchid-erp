const express = require('express');
const indentsController = require('./indents.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/',    indentsController.getAll);
router.get('/:id', indentsController.getById);
router.post('/',   indentsController.create);

// Store/Incharge submits indent to HOD
router.patch('/:id/submit',
  requireRole('STORE_MANAGER', 'INCHARGE', 'SITE_ENGINEER', 'ADMIN'),
  indentsController.submitToHOD
);

// HOD of User Dept: approve / reject / hold  (body: { action: 'approve'|'reject'|'hold', notes })
router.patch('/:id/hod-action',
  requireRole('USER_HOD', 'ADMIN'),
  indentsController.hodAction
);

// Purchase HOD: accept / return / hold  (body: { action: 'accept'|'return'|'hold', notes })
router.patch('/:id/purchase-action',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  indentsController.purchaseHodAction
);

module.exports = router;
