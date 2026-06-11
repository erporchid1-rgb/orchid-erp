const express = require('express');
const ctrl = require('./nfa.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');
const upload = require('../../middleware/upload');

const router = express.Router();
router.use(authenticate);

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);

// Purchase HOD creates NFA
router.post('/',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.create
);

// Upload Draft PO document
router.post('/:id/upload-draft-po',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  upload.single('file'),
  ctrl.uploadDraftPO
);

// Signing endpoints — each role signs in order
// body: { action: 'gm_sign' | 'user_sign' | 'cfo_sign' | 'president_sign' | 'dir_sign' }
router.patch('/:id/sign',
  requireRole('GM_PURCHASE', 'USER_HOD', 'CFO', 'PRESIDENT_PROJECTS', 'EXE_DIRECTOR', 'ADMIN'),
  ctrl.sign
);

// MD final decision  body: { action: 'approve'|'reject'|'hold', notes, approvalMode?, mdUserId? }
// MD does it digitally; PURCHASE_HOD/GM_PURCHASE can record physical/call approval on MD's behalf
router.patch('/:id/md-action',
  requireRole('MD', 'ADMIN', 'PURCHASE_HOD', 'GM_PURCHASE'),
  ctrl.mdAction
);

module.exports = router;
