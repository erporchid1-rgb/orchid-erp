const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateNFANumber } = require('../../utils/generateNumber');

const INCLUDE = {
  indent:            { select: { id: true, indentNumber: true, category: true, department: true } },
  cs:                { select: { id: true, csNumber: true, status: true } },
  createdBy:         { select: { id: true, name: true } },
  gmSignedBy:        { select: { id: true, name: true } },
  userSignedBy:      { select: { id: true, name: true } },
  cfoSignedBy:       { select: { id: true, name: true } },
  presidentSignedBy: { select: { id: true, name: true } },
  dirSignedBy:       { select: { id: true, name: true } },
  mdApprovedBy:      { select: { id: true, name: true } },
  purchases:         { select: { id: true, billNo: true, status: true, poType: true } },
};

// NFA signing order
const SIGN_FLOW = [
  { status: 'DRAFT',             action: 'gm_sign',         nextStatus: 'GM_SIGNED',        field: 'gmSignedById',        dateField: 'gmSignedAt' },
  { status: 'GM_SIGNED',         action: 'user_sign',        nextStatus: 'USER_SIGNED',       field: 'userSignedById',       dateField: 'userSignedAt' },
  { status: 'USER_SIGNED',       action: 'cfo_sign',         nextStatus: 'CFO_SIGNED',        field: 'cfoSignedById',        dateField: 'cfoSignedAt' },
  { status: 'CFO_SIGNED',        action: 'president_sign',   nextStatus: 'PRESIDENT_SIGNED',  field: 'presidentSignedById',  dateField: 'presidentSignedAt' },
  { status: 'PRESIDENT_SIGNED',  action: 'dir_sign',         nextStatus: 'DIR_SIGNED',        field: 'dirSignedById',        dateField: 'dirSignedAt' },
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
        totalAmount: parseFloat(data.totalAmount) || 0,
        advancePercent: data.advancePercent ? parseFloat(data.advancePercent) : null,
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
const sign = async (id, action, userId) => {
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
    },
    include: INCLUDE,
  });
};

// MD final approval / rejection / hold
const mdAction = async (id, action, notes, userId) => {
  const nfa = await prisma.nFA.findUnique({ where: { id }, include: { indent: true } });
  if (!nfa) throw { status: 404, message: 'NFA not found' };
  if (nfa.status !== 'DIR_SIGNED') throw { status: 400, message: 'NFA must be DIR_SIGNED for MD action' };

  const statusMap = { approve: 'MD_APPROVED', reject: 'MD_REJECTED', hold: 'MD_HOLD' };
  if (!statusMap[action]) throw { status: 400, message: 'Invalid action' };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.nFA.update({
      where: { id },
      data: {
        status: statusMap[action],
        mdApprovedById: userId,
        mdApprovedAt: new Date(),
        mdNotes: notes || null,
      },
      include: INCLUDE,
    });
    if (action === 'approve') {
      await tx.indent.update({ where: { id: nfa.indentId }, data: { status: 'NFA_APPROVED' } });
    }
    return updated;
  });
};

module.exports = { getAll, getById, create, uploadDraftPO, sign, mdAction };
