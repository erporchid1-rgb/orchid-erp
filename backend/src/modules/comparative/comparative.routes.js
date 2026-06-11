const express = require('express');
const ctrl = require('./comparative.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');
const upload = require('../../middleware/upload');

const router = express.Router();
router.use(authenticate);

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

// Purchase Dept creates CS
router.post('/',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.create
);

// Add a quotation
router.post('/:id/quotations',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.addQuotation
);

// Upload quotation file
router.post('/:id/quotations/:quotationId/upload',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  upload.single('file'),
  ctrl.uploadQuotationFile
);

// Select winning supplier (Purchase HOD, User HOD, President can all change selection)
router.patch('/:id/select-supplier',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'USER_HOD', 'PRESIDENT_PROJECTS', 'ADMIN'),
  ctrl.selectSupplier
);

// Purchase HOD recommends
router.patch('/:id/hod-recommend',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.hodRecommend
);

// User Dept verifies
router.patch('/:id/user-verify',
  requireRole('USER_HOD', 'PRESIDENT_PROJECTS', 'ADMIN'),
  ctrl.userVerify
);

// President-Projects final verify
router.patch('/:id/president-verify',
  requireRole('PRESIDENT_PROJECTS', 'ADMIN'),
  ctrl.presidentVerify
);

module.exports = router;
