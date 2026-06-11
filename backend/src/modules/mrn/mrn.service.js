const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateMRNNumber } = require('../../utils/generateNumber');

const INCLUDE = {
  purchase: {
    select: { id: true, billNo: true, poType: true, totalAmount: true,
              supplier: { select: { id: true, supplierName: true } } },
  },
  createdBy:            { select: { id: true, name: true } },
  storeVerifiedBy:      { select: { id: true, name: true } },
  purchaseHodVerifiedBy: { select: { id: true, name: true } },
  items: {
    include: { material: { select: { id: true, materialName: true, unit: true } } },
  },
  documents: true,
};

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {
    ...(query.purchaseId && { purchaseId: query.purchaseId }),
    ...(query.status     && { status:     query.status }),
  };
  const [mrns, total] = await Promise.all([
    prisma.mRN.findMany({ where, skip, take: limit, include: INCLUDE, orderBy: { createdAt: 'desc' } }),
    prisma.mRN.count({ where }),
  ]);
  return { mrns, total, page, limit };
};

const getById = async (id) => {
  const mrn = await prisma.mRN.findUnique({ where: { id }, include: INCLUDE });
  if (!mrn) throw { status: 404, message: 'MRN not found' };
  return mrn;
};

const create = async (data, userId) => {
  const mrnNumber = await generateMRNNumber();
  const { items = [], ...mrnData } = data;

  return prisma.mRN.create({
    data: {
      ...mrnData,
      mrnNumber,
      createdById: userId,
      status: 'DRAFT',
      mrnDate: mrnData.mrnDate ? new Date(mrnData.mrnDate) : new Date(),
      invoiceDate: mrnData.invoiceDate ? new Date(mrnData.invoiceDate) : null,
      items: {
        create: items.map((i) => ({
          materialId:  i.materialId,
          poQty:       parseFloat(i.poQty)       || 0,
          receivedQty: parseFloat(i.receivedQty) || 0,
          rejectedQty: parseFloat(i.rejectedQty) || 0,
          unit:        i.unit,
          poRate:      parseFloat(i.poRate)       || 0,
          receivedRate: i.receivedRate ? parseFloat(i.receivedRate) : null,
          remarks:     i.remarks || null,
        })),
      },
    },
    include: INCLUDE,
  });
};

// Upload a document to MRN
const uploadDocument = async (mrnId, docType, fileName) => {
  const mrn = await prisma.mRN.findUnique({ where: { id: mrnId } });
  if (!mrn) throw { status: 404, message: 'MRN not found' };
  return prisma.mRNDocument.create({
    data: { mrnId, docType, fileName },
  });
};

// Determine MRN completion status based on items
const computeStatus = (items) => {
  let hasBalance = false;
  let hasExcess  = false;
  let hasRateDiff = false;
  for (const item of items) {
    const balance = item.poQty - item.receivedQty;
    if (balance > 0) hasBalance = true;
    if (balance < 0) hasExcess  = true;
    if (item.receivedRate && Math.abs(item.receivedRate - item.poRate) > 0.01) hasRateDiff = true;
  }
  if (hasRateDiff) return 'RATE_DIFF';
  if (hasExcess)   return 'EXCESS';
  if (hasBalance)  return 'PARTIAL';
  return 'COMPLETE';
};

// Store verifies MRN (stamps Checked & Received)
const storeVerify = async (id, userId) => {
  const mrn = await prisma.mRN.findUnique({ where: { id }, include: { items: true } });
  if (!mrn) throw { status: 404, message: 'MRN not found' };
  if (mrn.status === 'DRAFT') {
    const autoStatus = computeStatus(mrn.items);
    await prisma.mRN.update({ where: { id }, data: { status: autoStatus } });
  }

  // Create stock movements for received items
  const updatedMrn = await prisma.$transaction(async (tx) => {
    const m = await tx.mRN.update({
      where: { id },
      data: {
        storeVerifiedById: userId,
        storeVerifiedAt: new Date(),
      },
      include: {
        ...INCLUDE,
        purchase: {
          select: { id: true, billNo: true, poType: true, totalAmount: true,
                    projectId: true, siteId: true,
                    supplier: { select: { id: true, supplierName: true } } },
        },
      },
    });

    for (const item of m.items) {
      if (item.receivedQty > 0 && m.purchaseId) {
        const lastMovement = await tx.stockMovement.findFirst({
          where: { materialId: item.materialId },
          orderBy: { createdAt: 'desc' },
        });
        const currentBalance = parseFloat(lastMovement?.balanceAfter || 0);
        await tx.stockMovement.create({
          data: {
            materialId:   item.materialId,
            projectId:    m.purchase?.projectId || null,
            siteId:       m.purchase?.siteId    || null,
            movementType: 'MRN_RECEIVED',
            quantity:     item.receivedQty,
            balanceAfter: currentBalance + item.receivedQty,
            unit:         item.unit,
            rate:         item.receivedRate || item.poRate,
            referenceId:  m.id,
            referenceType: 'MRN',
            mrnId:        m.id,
            remarks:      `MRN: ${m.mrnNumber}`,
            movementDate: m.mrnDate,
          },
        });

        // Create negative movement for rejected items
        if (item.rejectedQty > 0) {
          const afterReceive = currentBalance + item.receivedQty;
          await tx.stockMovement.create({
            data: {
              materialId:   item.materialId,
              projectId:    m.purchase?.projectId || null,
              siteId:       m.purchase?.siteId    || null,
              movementType: 'MRN_REJECTED',
              quantity:     -item.rejectedQty,
              balanceAfter: afterReceive - item.rejectedQty,
              unit:         item.unit,
              rate:         item.poRate,
              referenceId:  m.id,
              referenceType: 'MRN',
              mrnId:        m.id,
              remarks:      `MRN Rejection: ${m.mrnNumber}`,
              movementDate: m.mrnDate,
            },
          });
        }
      }
    }

    return m;
  });

  return updatedMrn;
};

// Purchase HOD final verification → forward to Finance
const purchaseHodVerify = async (id, userId) => {
  const mrn = await prisma.mRN.findUnique({ where: { id } });
  if (!mrn) throw { status: 404, message: 'MRN not found' };
  if (!mrn.storeVerifiedAt) throw { status: 400, message: 'MRN must be store-verified first' };

  return prisma.mRN.update({
    where: { id },
    data: {
      purchaseHodVerifiedById: userId,
      purchaseHodVerifiedAt: new Date(),
      forwardedToFinance: true,
    },
    include: INCLUDE,
  });
};

// Close PO after final payment
const closePO = async (id) => {
  const mrn = await prisma.mRN.findUnique({ where: { id } });
  if (!mrn) throw { status: 404, message: 'MRN not found' };
  return prisma.$transaction(async (tx) => {
    const updated = await tx.mRN.update({ where: { id }, data: { poClosed: true } });
    if (mrn.purchaseId) {
      await tx.purchase.update({ where: { id: mrn.purchaseId }, data: { status: 'CLOSED' } });
    }
    return updated;
  });
};

module.exports = { getAll, getById, create, uploadDocument, storeVerify, purchaseHodVerify, closePO };
