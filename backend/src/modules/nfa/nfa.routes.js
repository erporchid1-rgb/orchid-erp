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
)

router.put('/:id',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.update
);

// Upload Draft PO document
router.post('/:id/upload-draft-po',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  upload.single('file'),
  ctrl.uploadDraftPO
);

// Signing endpoints — each role approves/rejects/holds in order
// body: { action: 'gm_sign' | 'user_sign' | 'cfo_sign' | 'president_sign' | 'dir_sign', decision: 'approve'|'reject'|'hold', notes? }
// PURCHASE_HOD can call gm_sign/approve to "submit for approval" (advances without a separate approval step)
router.patch('/:id/sign',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'USER_HOD', 'CFO', 'PRESIDENT_PROJECTS', 'EXE_DIRECTOR', 'ADMIN'),
  ctrl.sign
);

// Purchase HOD resumes a RETURNED (rejected/held) NFA from where it was paused
router.patch('/:id/resubmit',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.resubmit
);

// Mark a signatory as on leave — Purchase HOD skips that step
router.patch('/:id/mark-leave',
  requireRole('PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'),
  ctrl.markLeave
);

// MD final decision  body: { action: 'approve'|'reject'|'hold', notes, approvalMode?, mdUserId? }
// MD does it digitally; PURCHASE_HOD/GM_PURCHASE can record physical/call approval on MD's behalf
router.patch('/:id/md-action',
  requireRole('MD', 'ADMIN', 'PURCHASE_HOD', 'GM_PURCHASE'),
  ctrl.mdAction
);

module.exports = router;
