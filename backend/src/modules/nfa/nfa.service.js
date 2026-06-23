const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateNFANumber } = require('../../utils/generateNumber');

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

// Generic sign action by any signatory
const sign = async (id, action, userId, signature) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };

  const step = SIGN_FLOW.find((s) => s.action === action);
  if (!step) throw { status: 400, message: 'Invalid sign action' };
  if (nfa.status !== step.status) {
    throw { status: 400, message: `NFA must be in ${step.status} status for this action` };
  }

  return prisma.nFA.update({
    where: { id },
    data: {
      status: step.nextStatus,
      [step.field]:     userId,
      [step.dateField]: new Date(),
      ...(signature && { [step.sigField]: signature }),
    },
    include: INCLUDE,
  });
};

// MD final approval / rejection / hold
// approvalMode: 'DIGITAL' (MD himself) | 'HARD_COPY' (physical sign) | 'PHONE_CALL'
// recordedByRole: if purchase role is recording on behalf of MD, pass their userId as recordedById
const mdAction = async (id, action, notes, userId, signature, approvalMode, recordedById) => {
  const nfa = await prisma.nFA.findUnique({ where: { id }, include: { indent: true } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  if (nfa.status !== 'DIR_SIGNED') throw { status: 400, message: 'NFA must be DIR_SIGNED for MD action' };

  const statusMap = { approve: 'MD_APPROVED', reject: 'MD_REJECTED', hold: 'MD_HOLD' };
  if (!statusMap[action]) throw { status: 400, message: 'Invalid action' };

  // When purchase role records on behalf of MD, notes are mandatory
  if (recordedById && !notes) throw { status: 400, message: 'Notes are required when recording MD decision on their behalf' };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.nFA.update({
      where: { id },
      data: {
        status: statusMap[action],
        mdApprovedById: userId,
        mdApprovedAt: new Date(),
        mdNotes: notes || null,
        mdApprovalMode: approvalMode || 'DIGITAL',
        ...(recordedById && { mdRecordedById: recordedById }),
        ...(signature && { mdSignature: signature }),
      },
      include: INCLUDE,
    });
    if (action === 'approve') {
      await tx.indent.update({ where: { id: nfa.indentId }, data: { status: 'NFA_APPROVED' } });
    }
    return updated;
  });
};

const update = async (id, data) => {
  const nfa = await prisma.nFA.findUnique({ where: { id } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  if (nfa.status !== 'DRAFT') throw { status: 400, message: 'Only DRAFT NFAs can be edited' };
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

module.exports = { getAll, getById, create, update, uploadDraftPO, sign, mdAction, markLeave };
