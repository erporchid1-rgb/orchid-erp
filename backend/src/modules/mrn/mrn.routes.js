const express = require('express');
const ctrl = require('./mrn.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');
const upload = require('../../middleware/upload');

const router = express.Router();
router.use(authenticate);

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

// Store / Incharge creates MRN
router.post('/',
  requireRole('STORE_MANAGER', 'INCHARGE', 'SITE_ENGINEER', 'ADMIN'),
  ctrl.create
);

// Upload supporting document
router.post('/:id/documents',
  upload.single('file'),
  ctrl.uploadDocument
);

// Store verifies (stamps Checked & Received) — triggers stock movement
router.patch('/:id/store-verify',
  requireRole('STORE_MANAGER', 'INCHARGE', 'ADMIN'),
  ctrl.storeVerify
);

// Purchase HOD final verification → forwards to Finance
router.patch('/:id/purchase-verify',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.purchaseHodVerify
);

// Close PO after final payment
router.patch('/:id/close-po',
  requireRole('PURCHASE_HOD', 'FINANCE', 'ADMIN'),
  ctrl.closePO
);

module.exports = router;
