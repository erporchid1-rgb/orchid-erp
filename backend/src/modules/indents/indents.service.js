const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateIndentNumber } = require('../../utils/generateNumber');

const getAll = async (query, userId, userRole) => {
  const { page, limit, skip } = getPagination(query);
  const where = {
    ...(query.status && { status: query.status }),
    ...(query.projectId && { projectId: query.projectId }),
    ...(query.siteId && { siteId: query.siteId }),
    ...(userRole === 'SITE_ENGINEER' && { requestedById: userId }),
  };

  const [indents, total] = await Promise.all([
    prisma.indent.findMany({
      where, skip, take: limit,
      include: {
        project: { select: { id: true, projectName: true } },
        site: { select: { id: true, siteName: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { material: { select: { id: true, materialName: true, unit: true } } } },
        purchases: { select: { id: true, billNo: true, status: true } },
      },
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
      project: { select: { id: true, projectName: true } },
      site: { select: { id: true, siteName: true } },
      requestedBy: { select: { id: true, name: true, role: true } },
      approvedBy: { select: { id: true, name: true } },
      items: { include: { material: { include: { category: true } } } },
      purchases: { select: { id: true, billNo: true, status: true, totalAmount: true } },
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
      items: { create: items.map((i) => ({ materialId: i.materialId, requestedQty: parseFloat(i.requestedQty), unit: i.unit, remarks: i.remarks || null })) },
    },
    include: {
      items: { include: { material: true } },
      requestedBy: { select: { id: true, name: true } },
    },
  });
};

const approve = async (id, notes, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (indent.status !== 'PENDING') throw { status: 400, message: 'Only PENDING indents can be approved' };
  if (indent.requestedById === userId) throw { status: 403, message: 'You cannot approve your own indent' };
  return prisma.indent.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: userId, approvalNotes: notes || null },
  });
};

const reject = async (id, notes, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (indent.status !== 'PENDING') throw { status: 400, message: 'Only PENDING indents can be rejected' };
  if (indent.requestedById === userId) throw { status: 403, message: 'You cannot reject your own indent' };
  return prisma.indent.update({
    where: { id },
    data: { status: 'REJECTED', approvedById: userId, approvalNotes: notes || null },
  });
};

module.exports = { getAll, getById, create, approve, reject };
