const prisma = require('../../config/database');
const { getPagination, buildSearch } = require('../../utils/pagination');
const { generateBillNumber } = require('../../utils/generateNumber');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const search = buildSearch(query.search, ['billNo']);
  const where = {
    deletedAt: null,
    ...search,
    ...(query.supplierId && { supplierId: query.supplierId }),
    ...(query.projectId && { projectId: query.projectId }),
    ...(query.siteId && { siteId: query.siteId }),
    ...(query.status && { status: query.status }),
    ...(query.fromDate && query.toDate && {
      purchaseDate: { gte: new Date(query.fromDate), lte: new Date(query.toDate) },
    }),
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where, skip, take: limit,
      include: {
        supplier: { select: { id: true, supplierName: true } },
        project: { select: { id: true, projectName: true } },
        site: { select: { id: true, siteName: true } },
        orderedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        indent: { select: { id: true, indentNumber: true } },
        items: { include: { material: { select: { materialName: true, unit: true } } } },
      },
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.purchase.count({ where }),
  ]);
  return { purchases, total, page, limit };
};

const getById = async (id) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id, deletedAt: null },
    include: {
      supplier: true,
      project: { select: { id: true, projectName: true } },
      site: { select: { id: true, siteName: true } },
      orderedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      indent: { select: { id: true, indentNumber: true, purpose: true } },
      items: { include: { material: { include: { category: true } } } },
    },
  });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  return purchase;
};

const create = async (data, userId) => {
  const billNo = await generateBillNumber();
  const { items, ...purchaseData } = data;

  let subtotal = 0;
  let totalGst = 0;
  const processedItems = items.map((item) => {
    const qty    = parseFloat(item.quantity)   || 0;
    const rate   = parseFloat(item.rate)       || 0;
    const gstPct = parseFloat(item.gstPercent) || 0;
    const base   = qty * rate;
    const gstAmt = (base * gstPct) / 100;
    subtotal  += base;
    totalGst  += gstAmt;
    return {
      materialId: item.materialId,
      unit:       item.unit,
      quantity:   qty,
      rate:       rate,
      gstPercent: gstPct,
      gstAmount:  gstAmt,
      amount:     base + gstAmt,
    };
  });

  const totalAmount = subtotal + totalGst
    + (parseFloat(purchaseData.transportCost)  || 0)
    - (parseFloat(purchaseData.discountAmount) || 0);

  const purchase = await prisma.$transaction(async (tx) => {
    const newPurchase = await tx.purchase.create({
      data: {
        ...purchaseData,
        billNo,
        orderedById: userId,
        subtotal,
        gstAmount:      totalGst,
        totalAmount,
        transportCost:  parseFloat(purchaseData.transportCost)  || 0,
        discountAmount: parseFloat(purchaseData.discountAmount) || 0,
        paidAmount:     parseFloat(purchaseData.paidAmount)     || 0,
        items: { create: processedItems },
      },
      include: {
        supplier: true,
        items: { include: { material: true } },
      },
    });

    // Mark indent as PO_CREATED if linked
    if (purchaseData.indentId) {
      await tx.indent.update({
        where: { id: purchaseData.indentId },
        data: { status: 'PO_CREATED' },
      });
    }

    if (purchaseData.status === 'RECEIVED') {
      await createStockMovementsForPurchase(tx, newPurchase, purchaseData.projectId, purchaseData.siteId);
    }

    return newPurchase;
  });

  return purchase;
};

const createStockMovementsForPurchase = async (tx, purchase, projectId, siteId) => {
  for (const item of purchase.items) {
    const lastMovement = await tx.stockMovement.findFirst({
      where: { materialId: item.materialId, ...(siteId ? { siteId } : { projectId }) },
      orderBy: { createdAt: 'desc' },
    });
    const currentBalance = parseFloat(lastMovement?.balanceAfter || 0);
    const newBalance = currentBalance + parseFloat(item.quantity);

    await tx.stockMovement.create({
      data: {
        materialId: item.materialId,
        projectId: projectId || null,
        siteId: siteId || null,
        movementType: 'PURCHASE',
        quantity: item.quantity,
        balanceAfter: newBalance,
        unit: item.unit,
        rate: item.rate,
        purchaseId: purchase.id,
        referenceId: purchase.id,
        referenceType: 'PURCHASE',
        remarks: `Purchase: ${purchase.billNo}`,
        movementDate: purchase.purchaseDate,
      },
    });
  }
};

const updateStatus = async (id, status, userId) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id, deletedAt: null },
    include: { items: { include: { material: true } } },
  });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };

  const updatedPurchase = await prisma.$transaction(async (tx) => {
    const updated = await tx.purchase.update({
      where: { id },
      data: { status, ...(status === 'RECEIVED' && { receivedDate: new Date() }) },
    });

    if (status === 'RECEIVED' && purchase.status !== 'RECEIVED') {
      await createStockMovementsForPurchase(tx, purchase, purchase.projectId, purchase.siteId);
    }

    return updated;
  });

  return updatedPurchase;
};

const submitForApproval = async (id, userId) => {
  const purchase = await prisma.purchase.findUnique({ where: { id, deletedAt: null } });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  if (purchase.status !== 'DRAFT') throw { status: 400, message: 'Only DRAFT purchases can be submitted for approval' };
  return prisma.purchase.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
};

const approvePurchase = async (id, notes, userId) => {
  const purchase = await prisma.purchase.findUnique({ where: { id, deletedAt: null } });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  if (purchase.status !== 'PENDING_APPROVAL') throw { status: 400, message: 'Only PENDING_APPROVAL purchases can be approved' };
  return prisma.purchase.update({
    where: { id },
    data: { status: 'APPROVED', approvedById: userId, approvalNotes: notes || null },
  });
};

const rejectPurchase = async (id, notes, userId) => {
  const purchase = await prisma.purchase.findUnique({ where: { id, deletedAt: null } });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  if (purchase.status !== 'PENDING_APPROVAL') throw { status: 400, message: 'Only PENDING_APPROVAL purchases can be rejected' };
  return prisma.purchase.update({
    where: { id },
    data: { status: 'REJECTED', approvedById: userId, approvalNotes: notes || null },
  });
};

const uploadQuotation = async (id, num, filename) => {
  const purchase = await prisma.purchase.findUnique({ where: { id, deletedAt: null } });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  const field = `quotation${num}File`;
  return prisma.purchase.update({ where: { id }, data: { [field]: filename } });
};

const uploadInvoice = async (id, filename) => {
  const purchase = await prisma.purchase.findUnique({ where: { id, deletedAt: null } });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  return prisma.purchase.update({ where: { id }, data: { invoiceFile: filename } });
};

const remove = async (id) => {
  const purchase = await prisma.purchase.findUnique({ where: { id, deletedAt: null } });
  if (!purchase) throw { status: 404, message: 'Purchase not found' };
  if (purchase.status === 'RECEIVED') throw { status: 400, message: 'Cannot delete a received purchase' };
  return prisma.purchase.update({ where: { id }, data: { deletedAt: new Date() } });
};

module.exports = { getAll, getById, create, updateStatus, submitForApproval, approvePurchase, rejectPurchase, uploadQuotation, uploadInvoice, remove };
