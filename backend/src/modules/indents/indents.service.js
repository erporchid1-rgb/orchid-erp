const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateIndentNumber } = require('../../utils/generateNumber');

const INCLUDE = {
  project:    { select: { id: true, projectName: true } },
  site:       { select: { id: true, siteName: true } },
  requestedBy: { select: { id: true, name: true, role: true, department: true } },
  hodApprovedBy:    { select: { id: true, name: true, role: true } },
  purchaseApprovedBy: { select: { id: true, name: true, role: true } },
  items: {
    include: { material: { select: { id: true, materialName: true, unit: true, category: { select: { name: true } } } } },
  },
  purchases: { select: { id: true, billNo: true, status: true, poType: true } },
};

const getAll = async (query, userId, userRole) => {
  const { page, limit, skip } = getPagination(query);

  // Visibility rules per role
  let where = {};
  if (query.status)    where.status    = query.status;
  if (query.projectId) where.projectId = query.projectId;
  if (query.siteId)    where.siteId    = query.siteId;

  // Store/site engineers only see their own indents
  if (['SITE_ENGINEER', 'STORE_MANAGER', 'INCHARGE'].includes(userRole)) {
    where.requestedById = userId;
  }
  // User HOD sees indents pending HOD action + HOD_* status
  // Purchase HOD / Purchase roles see indents in their stage
  // Finance sees all from PURCHASE_ACCEPTED onwards
  // Others (admin, MD, etc.) see all

  const [indents, total] = await Promise.all([
    prisma.indent.findMany({
      where, skip, take: limit,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.indent.count({ where }),
  ]);
  return { indents, total, page, limit };
};

const getById = async (id) => {
  const indent = await prisma.indent.findUnique({
    where: { id },
    include: {
      ...INCLUDE,
      comparativeStatements: {
        include: {
          quotations: { include: { supplier: { select: { id: true, supplierName: true } } } },
          items: { include: { material: { select: { materialName: true } } } },
          createdBy: { select: { id: true, name: true } },
        },
      },
      nfas: {
        include: {
          createdBy: { select: { id: true, name: true } },
          gmSignedBy: { select: { id: true, name: true } },
          cfoSignedBy: { select: { id: true, name: true } },
          mdApprovedBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  return indent;
};

const create = async (data, userId) => {
  const indentNumber = await generateIndentNumber();
  const { items, ...indentData } = data;
  return prisma.indent.create({
    data: {
      ...indentData,
      indentNumber,
      requestedById: userId,
      status: 'DRAFT',
      items: {
        create: items.map((i) => ({
          materialId:        i.materialId,
          requestedQty:      parseFloat(i.requestedQty),
          unit:              i.unit,
          makeSpecifications: i.makeSpecifications || null,
          lastPurchaseFrom:  i.lastPurchaseFrom || null,
          remarks:           i.remarks || null,
        })),
      },
    },
    include: {
      items: { include: { material: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  });
};

// Store person submits to HOD
const submitToHOD = async (id, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (indent.status !== 'DRAFT') throw { status: 400, message: 'Only DRAFT indents can be submitted' };
  if (indent.requestedById !== userId) throw { status: 403, message: 'You can only submit your own indent' };
  return prisma.indent.update({ where: { id }, data: { status: 'HOD_PENDING' } });
};

// HOD of User Dept: approve / reject / hold
const hodAction = async (id, action, notes, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (indent.status !== 'HOD_PENDING') throw { status: 400, message: 'Indent is not pending HOD action' };

  const statusMap = { approve: 'HOD_APPROVED', reject: 'HOD_REJECTED', hold: 'HOD_HOLD' };
  if (!statusMap[action]) throw { status: 400, message: 'Invalid action' };

  const newStatus = statusMap[action];
  return prisma.indent.update({
    where: { id },
    data: {
      status: newStatus,
      hodApprovedById: userId,
      hodApprovalNotes: notes || null,
      hodApprovalDate: new Date(),
      ...(action === 'hold' && { hodHoldReason: notes || null }),
      // If approved, automatically move to Purchase HOD queue
      ...(action === 'approve' && { status: 'PURCHASE_PENDING' }),
    },
  });
};

// Purchase HOD: accept / return / hold
const purchaseHodAction = async (id, action, notes, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (indent.status !== 'PURCHASE_PENDING') throw { status: 400, message: 'Indent is not pending Purchase HOD action' };

  const statusMap = {
    accept: 'PURCHASE_ACCEPTED',
    return: 'PURCHASE_RETURNED',
    hold:   'PURCHASE_HOLD',
  };
  if (!statusMap[action]) throw { status: 400, message: 'Invalid action' };

  return prisma.indent.update({
    where: { id },
    data: {
      status: statusMap[action],
      purchaseApprovedById: userId,
      purchaseApprovalNotes: notes || null,
      purchaseApprovalDate: new Date(),
      ...(action === 'hold' && { purchaseHoldReason: notes || null }),
    },
  });
};

module.exports = { getAll, getById, create, submitToHOD, hodAction, purchaseHodAction };
