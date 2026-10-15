const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateNFANumber } = require('../../utils/generateNumber');
const purchasesService = require('../purchases/purchases.service');

const DEFAULT_PO_TC = `1. GST shall be paid extra as applicable.
2. The above rates are FOR at site including Cartage, Loading etc.
3. The payment shall be made as per agreed payment terms.
4. Unloading: The above rates are inclusive of unloading charges.
5. Test Certificate shall be provided with each consignment.
6. Material will be got tested if required by the Project-in-charge.
7. Delivery: Within agreed timeline from the release of Purchase Order.
8. Important Delivery Note: Deliveries are not accepted on Saturdays & Sundays.`;

// Mirrors the auto-fill CreatePurchasePage.jsx applies when a user manually picks an MD-approved NFA
const buildPOFromNFA = async (nfa) => {
  let csItems = [];
  if (nfa.csId) {
    const cs = await prisma.comparativeStatement.findUnique({
      where: { id: nfa.csId },
      include: { items: { include: { material: true } } },
    });
    csItems = cs?.items || [];
  }

  const poItems = csItems.map((i) => ({
    materialId: i.materialId,
    unit: i.unit,
    quantity: i.qty,
    rate: i.selectedRate || i.supplier1Rate || 0,
    gstPercent: nfa.gstPercent ?? 18,
  }));

  const matNames = csItems.map((i) => i.material?.materialName).filter(Boolean).join(', ');
  const projName = nfa.indent?.project?.projectName || '';
  const siteName = nfa.indent?.site?.siteName || '';
  const notes = matNames
    ? `Order for Supply of ${matNames} for ${[projName, siteName].filter(Boolean).join(' — ')}`
    : nfa.natureOfWork || '';

  return {
    poType: 'PO',
    status: 'PENDING_APPROVAL',
    purchaseDate: new Date(),
    supplierId: nfa.selectedSupplierId,
    projectId: nfa.indent?.project?.id || null,
    siteId: nfa.indent?.site?.id || null,
    indentId: nfa.indentId,
    nfaId: nfa.id,
    paymentTerms: nfa.paymentTerms || '',
    advancePercent: nfa.advancePercent || null,
    transportCost: 0,
    discountAmount: 0,
    termsConditions: DEFAULT_PO_TC,
    notes,
    items: poItems,
  };
};

const INCLUDE = {
  indent: {
    select: {
      id: true, indentNumber: true, category: true, department: true,
      project: { select: { id: true, projectName: true, location: true } },
      site:    { select: { id: true, siteName: true, address: true } },
    },
  },
  cs:               { select: { id: true, csNumber: true, status: true } },
  selectedSupplier: { select: { id: true, supplierName: true, address: true, gstNumber: true } },
  createdBy:         { select: { id: true, name: true } },
  gmSignedBy:        { select: { id: true, name: true } },
  userSignedBy:      { select: { id: true, name: true } },
  cfoSignedBy:       { select: { id: true, name: true } },
  presidentSignedBy: { select: { id: true, name: true } },
  dirSignedBy:       { select: { id: true, name: true } },
  mdApprovedBy:      { select: { id: true, name: true } },
  mdRecordedBy:      { select: { id: true, name: true } },
  returnedBy:        { select: { id: true, name: true } },
  purchases:         { select: { id: true, billNo: true, status: true, poType: true } },
};

// NFA signing order
const SIGN_FLOW = [
  { status: 'DRAFT',             action: 'gm_sign',         nextStatus: 'GM_SIGNED',        field: 'gmSignedById',        dateField: 'gmSignedAt',        sigField: 'gmSignature' },
  { status: 'GM_SIGNED',         action: 'user_sign',        nextStatus: 'USER_SIGNED',       field: 'userSignedById',       dateField: 'userSignedAt',       sigField: 'userSignature' },
  { status: 'USER_SIGNED',       action: 'cfo_sign',         nextStatus: 'CFO_SIGNED',        field: 'cfoSignedById',        dateField: 'cfoSignedAt',        sigField: 'cfoSignature' },
  { status: 'CFO_SIGNED',        action: 'president_sign',   nextStatus: 'PRESIDENT_SIGNED',  field: 'presidentSignedById',  dateField: 'presidentSignedAt',  sigField: 'presidentSignature' },
  { status: 'PRESIDENT_SIGNED',  action: 'dir_sign',         nextStatus: 'DIR_SIGNED',        field: 'dirSignedById',        dateField: 'dirSignedAt',        sigField: 'dirSignature' },
];

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {
    ...(query.indentId && { indentId: query.indentId }),
    ...(query.status   && { status:   query.status }),
  };
  const [nfas, total] = await Promise.all([
    prisma.nFA.findMany({ where, skip, take: limit, include: INCLUDE, orderBy: { createdAt: 'desc' } }),
    prisma.nFA.count({ where }),
  ]);
  return { nfas, total, page, limit };
};

const getById = async (id) => {
  const nfa = await prisma.nFA.findUnique({ where: { id }, include: INCLUDE });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  return nfa;
};

const create = async (data, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id: data.indentId } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (!['PURCHASE_ACCEPTED', 'NFA', 'COMPARATIVE'].includes(indent.status)) {
    throw { status: 400, message: 'Indent must be in NFA/COMPARATIVE/PURCHASE_ACCEPTED stage to create NFA' };
  }

  const nfaNumber = await generateNFANumber();
  return prisma.$transaction(async (tx) => {
    const nfa = await tx.nFA.create({
      data: {
        ...data,
        nfaNumber,
        createdById: userId,
        status: 'DRAFT',
        baseAmount:     parseFloat(data.baseAmount)     || 0,
        gstAmount:      parseFloat(data.gstAmount)      || 0,
        gstPercent:     data.gstPercent  ? parseFloat(data.gstPercent)  : null,
        totalAmount:    parseFloat(data.totalAmount)    || 0,
        advancePercent: data.advancePercent ? parseFloat(data.advancePercent) : null,
        quotationDate:  data.quotationDate  ? new Date(data.quotationDate)  : null,
        comparativeDate: data.comparativeDate ? new Date(data.comparativeDate) : null,
      },
      include: INCLUDE,
    });
    await tx.indent.update({ where: { id: data.indentId }, data: { status: 'NFA' } });
    return nfa;
  });
};

const uploadDraftPO = async (id, fileName) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  return prisma.nFA.update({ where: { id }, data: { draftPOFile: fileName }, include: INCLUDE });
};

// Generic action by any signatory — approve advances to the next step;
// reject/hold pause the NFA at RETURNED until Purchase HOD resubmits it
const sign = async (id, action, userId, decision = 'approve', notes) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };

  const step = SIGN_FLOW.find((s) => s.action === action);
  if (!step) throw { status: 400, message: 'Invalid sign action' };
  if (nfa.status !== step.status) {
    throw { status: 400, message: `NFA must be in ${step.status} status for this action` };
  }

  if (decision === 'approve') {
    return prisma.nFA.update({
      where: { id },
      data: {
        status: step.nextStatus,
        [step.field]:     userId,
        [step.dateField]: new Date(),
      },
      include: INCLUDE,
    });
  }

  if (!['reject', 'hold'].includes(decision)) throw { status: 400, message: 'Invalid decision' };
  if (!notes) throw { status: 400, message: 'A reason is required to reject or hold an NFA' };

  return prisma.nFA.update({
    where: { id },
    data: {
      status: 'RETURNED',
      returnedFromStatus: step.status,
      returnAction: decision === 'reject' ? 'REJECTED' : 'HOLD',
      returnReason: notes,
      returnedById: userId,
      returnedAt: new Date(),
    },
    include: INCLUDE,
  });
};

// Purchase HOD resumes a RETURNED NFA from the exact step it was paused at
const resubmit = async (id) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  if (nfa.status !== 'RETURNED') throw { status: 400, message: 'Only a RETURNED NFA can be resubmitted' };

  return prisma.nFA.update({
    where: { id },
    data: {
      status: nfa.returnedFromStatus || 'DRAFT',
      returnedFromStatus: null,
      returnAction: null,
      returnReason: null,
      returnedById: null,
      returnedAt: null,
    },
    include: INCLUDE,
  });
};

// MD final approval / rejection / hold
// approvalMode: 'DIGITAL' (MD himself) | 'HARD_COPY' (physical sign) | 'PHONE_CALL'
// recordedByRole: if purchase role is recording on behalf of MD, pass their userId as recordedById
const mdAction = async (id, action, notes, userId, approvalMode, recordedById) => {
  const nfa = await prisma.nFA.findUnique({ where: { id }, include: { indent: true } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  if (nfa.status !== 'DIR_SIGNED') throw { status: 400, message: 'NFA must be DIR_SIGNED for MD action' };
  if (!['approve', 'reject', 'hold'].includes(action)) throw { status: 400, message: 'Invalid action' };
  if (action !== 'approve' && !notes) throw { status: 400, message: 'A reason is required to reject or hold an NFA' };

  if (action !== 'approve') {
    return prisma.nFA.update({
      where: { id },
      data: {
        status: 'RETURNED',
        returnedFromStatus: 'DIR_SIGNED',
        returnAction: action === 'reject' ? 'REJECTED' : 'HOLD',
        returnReason: notes,
        returnedById: recordedById || userId,
        returnedAt: new Date(),
        mdApprovalMode: approvalMode || 'DIGITAL',
        ...(recordedById && { mdRecordedById: recordedById }),
      },
      include: INCLUDE,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.nFA.update({
      where: { id },
      data: {
        status: 'MD_APPROVED',
        mdApprovedById: userId,
        mdApprovedAt: new Date(),
        mdNotes: notes || null,
        mdApprovalMode: approvalMode || 'DIGITAL',
        ...(recordedById && { mdRecordedById: recordedById }),
      },
      include: INCLUDE,
    });
    await tx.indent.update({ where: { id: nfa.indentId }, data: { status: 'NFA_APPROVED' } });
    return result;
  });

  // Auto-create the PO from this NFA — GM Purchase just needs to approve it
  if (updated.selectedSupplierId) {
    const poData = await buildPOFromNFA(updated);
    if (poData.items.length) await purchasesService.create(poData, userId);
  }

  return updated;
};

const update = async (id, data) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  if (!['DRAFT', 'RETURNED'].includes(nfa.status)) throw { status: 400, message: 'Only a DRAFT or RETURNED NFA can be edited' };
  const { id: _id, nfaNumber, indentId, csId, createdById, status, ...updateData } = data;
  return prisma.nFA.update({
    where: { id },
    data: {
      ...updateData,
      baseAmount:      parseFloat(updateData.baseAmount)      || 0,
      gstAmount:       parseFloat(updateData.gstAmount)       || 0,
      gstPercent:      updateData.gstPercent  ? parseFloat(updateData.gstPercent)  : null,
      totalAmount:     parseFloat(updateData.totalAmount)     || 0,
      advancePercent:  updateData.advancePercent ? parseFloat(updateData.advancePercent) : null,
      quotationDate:   updateData.quotationDate  ? new Date(updateData.quotationDate)  : null,
      comparativeDate: updateData.comparativeDate ? new Date(updateData.comparativeDate) : null,
    },
    include: INCLUDE,
  });
};

// Mark a signatory as "on leave" — skips their step and advances to next status
const KEY_TO_STEP = {
  gm:        { status: 'DRAFT',            nextStatus: 'GM_SIGNED' },
  user:      { status: 'GM_SIGNED',        nextStatus: 'USER_SIGNED' },
  cfo:       { status: 'USER_SIGNED',      nextStatus: 'CFO_SIGNED' },
  president: { status: 'CFO_SIGNED',       nextStatus: 'PRESIDENT_SIGNED' },
  dir:       { status: 'PRESIDENT_SIGNED', nextStatus: 'DIR_SIGNED' },
};

const markLeave = async (id, signatoryKey) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };

  const step = KEY_TO_STEP[signatoryKey];
  if (!step) throw { status: 400, message: 'Invalid signatory key' };
  if (nfa.status !== step.status) {
    throw { status: 400, message: `NFA is not at this signatory's step (current: ${nfa.status})` };
  }

  const leaves = nfa.signatoryLeaves ? JSON.parse(nfa.signatoryLeaves) : {};
  leaves[signatoryKey] = true;

  return prisma.nFA.update({
    where: { id },
    data: { status: step.nextStatus, signatoryLeaves: JSON.stringify(leaves) },
    include: INCLUDE,
  });
};

module.exports = { getAll, getById, create, update, uploadDraftPO, sign, resubmit, mdAction, markLeave };
