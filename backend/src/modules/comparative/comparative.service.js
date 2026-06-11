const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateCSNumber } = require('../../utils/generateNumber');

const INCLUDE = {
  indent: {
    select: { id: true, indentNumber: true, category: true, department: true, status: true },
  },
  createdBy:           { select: { id: true, name: true } },
  hodRecommendedBy:    { select: { id: true, name: true } },
  userVerifiedBy:      { select: { id: true, name: true } },
  presidentVerifiedBy: { select: { id: true, name: true } },
  quotations: {
    include: { supplier: { select: { id: true, supplierName: true } } },
  },
  items: {
    include: { material: { select: { id: true, materialName: true, unit: true } } },
  },
};

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {
    ...(query.indentId && { indentId: query.indentId }),
    ...(query.status   && { status:   query.status }),
  };
  const [comparatives, total] = await Promise.all([
    prisma.comparativeStatement.findMany({ where, skip, take: limit, include: INCLUDE, orderBy: { createdAt: 'desc' } }),
    prisma.comparativeStatement.count({ where }),
  ]);
  return { comparatives, total, page, limit };
};

const getById = async (id) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id }, include: INCLUDE });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  return cs;
};

const create = async (data, userId) => {
  const indent = await prisma.indent.findUnique({ where: { id: data.indentId } });
  if (!indent) throw { status: 404, message: 'Indent not found' };
  if (!['PURCHASE_ACCEPTED'].includes(indent.status)) {
    throw { status: 400, message: 'Indent must be PURCHASE_ACCEPTED to create a Comparative Statement' };
  }

  const csNumber = await generateCSNumber();
  const { items = [], quotations = [], ...csData } = data;

  const cs = await prisma.$transaction(async (tx) => {
    const newCS = await tx.comparativeStatement.create({
      data: {
        ...csData,
        csNumber,
        createdById: userId,
        status: 'DRAFT',
        items: {
          create: items.map((i) => ({
            materialId:   i.materialId,
            qty:          parseFloat(i.qty),
            unit:         i.unit,
            supplier1Rate: i.supplier1Rate ? parseFloat(i.supplier1Rate) : null,
            supplier2Rate: i.supplier2Rate ? parseFloat(i.supplier2Rate) : null,
            supplier3Rate: i.supplier3Rate ? parseFloat(i.supplier3Rate) : null,
            selectedRate: i.selectedRate  ? parseFloat(i.selectedRate)  : null,
          })),
        },
        quotations: {
          create: quotations.map((q) => ({
            supplierId:    q.supplierId,
            quotationFile: q.quotationFile || null,
            quotationDate: q.quotationDate ? new Date(q.quotationDate) : null,
            totalAmount:   q.totalAmount   ? parseFloat(q.totalAmount)  : null,
            remarks:       q.remarks       || null,
            isSelected:    q.isSelected    || false,
          })),
        },
      },
      include: INCLUDE,
    });

    // Move indent to COMPARATIVE stage
    await tx.indent.update({ where: { id: data.indentId }, data: { status: 'COMPARATIVE' } });

    return newCS;
  });

  return cs;
};

const addQuotation = async (csId, data) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id: csId } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  return prisma.cSQuotation.create({
    data: {
      csId,
      supplierId:    data.supplierId,
      quotationFile: data.quotationFile || null,
      quotationDate: data.quotationDate ? new Date(data.quotationDate) : null,
      totalAmount:   data.totalAmount   ? parseFloat(data.totalAmount)  : null,
      remarks:       data.remarks       || null,
      isSelected:    data.isSelected    || false,
    },
  });
};

const updateQuotationFile = async (csId, quotationId, fileName) => {
  return prisma.cSQuotation.update({ where: { id: quotationId }, data: { quotationFile: fileName } });
};

const selectSupplier = async (csId, supplierId) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id: csId } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  await prisma.cSQuotation.updateMany({ where: { csId }, data: { isSelected: false } });
  await prisma.cSQuotation.updateMany({ where: { csId, supplierId }, data: { isSelected: true } });
  return prisma.comparativeStatement.update({
    where: { id: csId },
    data: { selectedSupplierId: supplierId },
    include: INCLUDE,
  });
};

// Purchase HOD recommends CS
const hodRecommend = async (id, notes, userId) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  if (cs.status !== 'DRAFT') throw { status: 400, message: 'CS must be in DRAFT to recommend' };
  return prisma.comparativeStatement.update({
    where: { id },
    data: {
      status: 'HOD_RECOMMENDED',
      hodRecommendedById: userId,
      hodRecommendedAt: new Date(),
      hodNotes: notes || null,
    },
    include: INCLUDE,
  });
};

// User Dept verifies
const userVerify = async (id, userId) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  if (cs.status !== 'HOD_RECOMMENDED') throw { status: 400, message: 'CS must be HOD_RECOMMENDED for user verification' };
  return prisma.comparativeStatement.update({
    where: { id },
    data: { status: 'USER_VERIFIED', userVerifiedById: userId, userVerifiedAt: new Date() },
    include: INCLUDE,
  });
};

// President-Projects gives final verification
const presidentVerify = async (id, userId) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  if (cs.status !== 'USER_VERIFIED') throw { status: 400, message: 'CS must be USER_VERIFIED for final verification' };
  await prisma.comparativeStatement.update({
    where: { id },
    data: {
      status: 'FINAL_VERIFIED',
      presidentVerifiedById: userId,
      presidentVerifiedAt: new Date(),
    },
  });
  // Advance indent to NFA stage
  await prisma.indent.update({ where: { id: cs.indentId }, data: { status: 'NFA' } });
  return prisma.comparativeStatement.findUnique({ where: { id }, include: INCLUDE });
};

module.exports = {
  getAll, getById, create, addQuotation, updateQuotationFile,
  selectSupplier, hodRecommend, userVerify, presidentVerify,
};
