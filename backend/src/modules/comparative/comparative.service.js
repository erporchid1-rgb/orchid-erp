const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateCSNumber, generateNFANumber } = require('../../utils/generateNumber');

// Mirrors the signatory set CreateNFAPage.jsx uses for a manually-created NFA
const DEFAULT_SIGNATORIES = [
  { key: 'gm',        label: 'HOD — Purchase',      show: true },
  { key: 'user',      label: 'User Department',      show: true },
  { key: 'cfo',       label: 'CFO',                  show: true },
  { key: 'president', label: 'President — Projects', show: true },
  { key: 'dir',       label: 'Executive Director',   show: true },
];

// Same auto-fill mapping CreateNFAPage.jsx applies when a user manually picks an approved CS
const buildNFADataFromCS = (cs) => {
  const selectedQ = cs.quotations?.find((q) => q.isSelected);
  const items  = cs.items || [];
  const indent = cs.indent || {};

  const matNames = items.map((i) => i.material?.materialName).filter(Boolean);
  const natureOfWork = matNames.length
    ? `Supply of ${matNames.join(', ')} for ${indent.project?.projectName || ''} — ${indent.site?.siteName || ''}`
    : '';

  const itemDescription = items
    .map((i, idx) => {
      const rate = i.selectedRate || i.supplier1Rate || '';
      const rateStr = rate ? ` @ ₹${rate}/${i.unit}` : '';
      const spec = i.specification ? ` (${i.specification})` : '';
      return `${idx + 1}. ${i.material?.materialName}${spec} — Qty: ${i.qty} ${i.unit}${rateStr}`;
    })
    .join('\n');

  const specs = items.map((i) => i.specification).filter(Boolean);
  const productDescription = specs.length ? specs.join(', ') : matNames.join(', ');

  const warrantyStr  = selectedQ?.warranty     ? `Warranty: ${selectedQ.warranty}`        : '';
  const deliveryStr  = selectedQ?.deliveryDays ? `Delivery: ${selectedQ.deliveryDays} days` : '';
  const paymentTerms = [warrantyStr, deliveryStr].filter(Boolean).join(' | ');

  const gstPercent  = selectedQ?.gstPercent != null ? selectedQ.gstPercent : 18;
  const baseAmount  = selectedQ?.totalAmount || 0;
  const gstAmount   = parseFloat((baseAmount * gstPercent / 100).toFixed(2));
  const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));

  return {
    indentId: indent.id,
    csId: cs.id,
    selectedSupplierId: selectedQ?.supplierId || null,
    memoType: 'PO_MEMO',
    areaOfUse: indent.department || null,
    natureOfWork,
    productDescription,
    itemDescription,
    baseAmount,
    cartage: 'FOR',
    gstPercent,
    gstAmount,
    totalAmount,
    paymentTerms,
    modeOfPayment: 'ONLINE',
    quotationDate:   selectedQ?.quotationDate || null,
    comparativeDate: cs.createdAt || null,
    notes: selectedQ?.remarks || null,
    signatories: JSON.stringify(DEFAULT_SIGNATORIES),
  };
};

const INCLUDE = {
  indent: {
    select: {
      id: true, indentNumber: true, category: true, department: true, status: true,
      project: { select: { id: true, projectName: true, location: true } },
      site:    { select: { id: true, siteName: true, address: true } },
    },
  },
  createdBy:           { select: { id: true, name: true } },
  hodRecommendedBy:    { select: { id: true, name: true } },
  userVerifiedBy:      { select: { id: true, name: true } },
  presidentVerifiedBy: { select: { id: true, name: true } },
  quotations: {
    include: { supplier: { select: { id: true, supplierName: true, mobile: true, email: true, gstNumber: true } } },
    orderBy: { createdAt: 'asc' },
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
            materialId:    i.materialId,
            qty:           parseFloat(i.qty),
            unit:          i.unit,
            specification: i.specification || null,
            supplier1Rate: i.supplier1Rate ? parseFloat(i.supplier1Rate) : null,
            supplier2Rate: i.supplier2Rate ? parseFloat(i.supplier2Rate) : null,
            supplier3Rate: i.supplier3Rate ? parseFloat(i.supplier3Rate) : null,
            supplier4Rate: i.supplier4Rate ? parseFloat(i.supplier4Rate) : null,
            selectedRate:  i.selectedRate  ? parseFloat(i.selectedRate)  : null,
          })),
        },
        quotations: {
          create: quotations.map((q) => ({
            supplierId:    q.supplierId,
            quotationFile: q.quotationFile || null,
            quotationRef:  q.quotationRef  || null,
            quotationDate: q.quotationDate ? new Date(q.quotationDate) : null,
            totalAmount:   q.totalAmount   ? parseFloat(q.totalAmount)  : null,
            gstPercent:    q.gstPercent    ? parseFloat(q.gstPercent)   : null,
            deliveryDays:  q.deliveryDays  ? parseInt(q.deliveryDays)   : null,
            warranty:      q.warranty      || null,
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
  const cs = await prisma.comparativeStatement.findUnique({
    where: { id },
    include: { quotations: true },
  });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  if (cs.status !== 'DRAFT') throw { status: 400, message: 'CS must be in DRAFT to recommend' };
  if (!cs.selectedSupplierId) throw { status: 400, message: 'Supplier must be selected before recommending' };
  if (!cs.quotations || cs.quotations.length === 0) throw { status: 400, message: 'At least one quotation must be added before recommending' };
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

// User Dept verifies (can change supplier + add notes)
const userVerify = async (id, userId, notes, supplierId) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  if (cs.status !== 'HOD_RECOMMENDED') throw { status: 400, message: 'CS must be HOD_RECOMMENDED for user verification' };

  // Allow supplier change before verifying
  if (supplierId && supplierId !== cs.selectedSupplierId) {
    await prisma.cSQuotation.updateMany({ where: { csId: id }, data: { isSelected: false } });
    await prisma.cSQuotation.updateMany({ where: { csId: id, supplierId }, data: { isSelected: true } });
  }
  const effectiveSupplierId = supplierId || cs.selectedSupplierId;
  if (!effectiveSupplierId) throw { status: 400, message: 'Supplier must be selected before verifying' };

  return prisma.comparativeStatement.update({
    where: { id },
    data: {
      status: 'USER_VERIFIED',
      userVerifiedById: userId,
      userVerifiedAt: new Date(),
      userNotes: notes || null,
      selectedSupplierId: effectiveSupplierId,
    },
    include: INCLUDE,
  });
};

// President-Projects gives final verification (can change supplier + add notes)
const presidentVerify = async (id, userId, notes, supplierId) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id } });
  if (!cs) throw { status: 404, message: 'Comparative Statement not found' };
  if (cs.status !== 'USER_VERIFIED') throw { status: 400, message: 'CS must be USER_VERIFIED for final verification' };

  // Allow supplier change before final verify
  if (supplierId && supplierId !== cs.selectedSupplierId) {
    await prisma.cSQuotation.updateMany({ where: { csId: id }, data: { isSelected: false } });
    await prisma.cSQuotation.updateMany({ where: { csId: id, supplierId }, data: { isSelected: true } });
  }
  const effectiveSupplierId = supplierId || cs.selectedSupplierId;
  if (!effectiveSupplierId) throw { status: 400, message: 'Supplier must be selected before final verification' };

  const nfaNumber = await generateNFANumber();

  await prisma.$transaction(async (tx) => {
    const verifiedCS = await tx.comparativeStatement.update({
      where: { id },
      data: {
        status: 'FINAL_VERIFIED',
        presidentVerifiedById: userId,
        presidentVerifiedAt: new Date(),
        presidentNotes: notes || null,
        selectedSupplierId: effectiveSupplierId,
      },
      include: INCLUDE,
    });

    const nfaData = buildNFADataFromCS(verifiedCS);
    await tx.nFA.create({
      data: {
        ...nfaData,
        nfaNumber,
        createdById: userId,
        status: 'DRAFT',
      },
    });

    await tx.indent.update({ where: { id: cs.indentId }, data: { status: 'NFA' } });
  });

  return prisma.comparativeStatement.findUnique({ where: { id }, include: INCLUDE });
};

const update = async (id, data) => {
  const cs = await prisma.comparativeStatement.findUnique({ where: { id } });
  if (!cs) throw { status: 404, message: 'CS not found' };
  if (cs.status !== 'DRAFT') throw { status: 400, message: 'Only DRAFT comparative statements can be edited' };
  const { quotations = [], items = [], ...csData } = data;
  return prisma.$transaction(async (tx) => {
    await tx.cSQuotation.deleteMany({ where: { csId: id } });
    await tx.cSItem.deleteMany({ where: { csId: id } });
    return tx.comparativeStatement.update({
      where: { id },
      data: {
        notes: csData.notes || null,
        poWithoutCS: csData.poWithoutCS || false,
        detailRowsJson: csData.detailRowsJson || null,
        quotations: {
          create: quotations.map(q => ({
            supplierId:    q.supplierId,
            quotationRef:  q.quotationRef  || null,
            quotationDate: q.quotationDate ? new Date(q.quotationDate) : null,
            totalAmount:   q.totalAmount   ? parseFloat(q.totalAmount)  : null,
            gstPercent:    q.gstPercent    ? parseFloat(q.gstPercent)   : null,
            deliveryDays:  q.deliveryDays  ? parseInt(q.deliveryDays)   : null,
            warranty:      q.warranty      || null,
            remarks:       q.remarks       || null,
            isSelected:    q.isSelected    || false,
          })),
        },
        items: {
          create: items.map(i => ({
            materialId:    i.materialId,
            qty:           parseFloat(i.qty),
            unit:          i.unit,
            specification: i.specification || null,
            supplier1Rate: i.supplier1Rate ? parseFloat(i.supplier1Rate) : null,
            supplier2Rate: i.supplier2Rate ? parseFloat(i.supplier2Rate) : null,
            supplier3Rate: i.supplier3Rate ? parseFloat(i.supplier3Rate) : null,
            supplier4Rate: i.supplier4Rate ? parseFloat(i.supplier4Rate) : null,
            selectedRate:  i.selectedRate  ? parseFloat(i.selectedRate)  : null,
          })),
        },
      },
      include: INCLUDE,
    });
  });
};

module.exports = {
  getAll, getById, create, update, addQuotation, updateQuotationFile,
  selectSupplier, hodRecommend, userVerify, presidentVerify,
};
