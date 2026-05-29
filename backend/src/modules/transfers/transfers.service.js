const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateTransferNumber } = require('../../utils/generateNumber');
const { calculateStock } = require('../stock/stock.service');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {
    ...(query.status && { status: query.status }),
    ...(query.fromSiteId && { fromSiteId: query.fromSiteId }),
    ...(query.toSiteId && { toSiteId: query.toSiteId }),
  };

  const [transfers, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where, skip, take: limit,
      include: {
        fromProject: { select: { id: true, projectName: true } },
        fromSite: { select: { id: true, siteName: true } },
        toProject: { select: { id: true, projectName: true } },
        toSite: { select: { id: true, siteName: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { material: { select: { materialName: true, unit: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockTransfer.count({ where }),
  ]);
  return { transfers, total, page, limit };
};

const getById = async (id) => {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromProject: true, fromSite: true, toProject: true, toSite: true,
      createdBy: { select: { id: true, name: true, email: true } },
      items: { include: { material: { include: { category: true } } } },
    },
  });
  if (!transfer) throw { status: 404, message: 'Transfer not found' };
  return transfer;
};

const create = async (data, userId) => {
  const transferNumber = await generateTransferNumber();
  const { items, ...transferData } = data;

  // Validate stock availability
  for (const item of items) {
    const available = await calculateStock(item.materialId, transferData.fromSiteId, transferData.fromProjectId);
    if (available < parseFloat(item.quantity)) {
      const material = await prisma.material.findUnique({ where: { id: item.materialId } });
      throw { status: 400, message: `Insufficient stock for ${material?.materialName}. Available: ${available}` };
    }
  }

  const transfer = await prisma.$transaction(async (tx) => {
    const newTransfer = await tx.stockTransfer.create({
      data: {
        ...transferData,
        transferNumber,
        createdById: userId,
        status: 'COMPLETED',
        items: { create: items },
      },
      include: {
        items: { include: { material: true } },
        fromSite: true, toSite: true,
      },
    });

    const transferDate = new Date(transferData.transferDate);

    // Create stock movements (out from source, in to destination)
    for (const item of newTransfer.items) {
      // OUT from source
      const lastFromMovement = await tx.stockMovement.findFirst({
        where: { materialId: item.materialId, ...(transferData.fromSiteId ? { siteId: transferData.fromSiteId } : { projectId: transferData.fromProjectId }) },
        orderBy: { createdAt: 'desc' },
      });
      const fromBalance = parseFloat(lastFromMovement?.balanceAfter || 0);

      await tx.stockMovement.create({
        data: {
          materialId: item.materialId,
          projectId: transferData.fromProjectId || null,
          siteId: transferData.fromSiteId || null,
          movementType: 'TRANSFER_OUT',
          quantity: item.quantity,
          balanceAfter: Math.max(0, fromBalance - parseFloat(item.quantity)),
          unit: item.unit,
          transferId: newTransfer.id,
          referenceId: newTransfer.id,
          referenceType: 'TRANSFER',
          remarks: `Transfer out to ${newTransfer.toSite?.siteName || 'project'}: ${transferNumber}`,
          movementDate: transferDate,
        },
      });

      // IN to destination
      const lastToMovement = await tx.stockMovement.findFirst({
        where: { materialId: item.materialId, ...(transferData.toSiteId ? { siteId: transferData.toSiteId } : { projectId: transferData.toProjectId }) },
        orderBy: { createdAt: 'desc' },
      });
      const toBalance = parseFloat(lastToMovement?.balanceAfter || 0);

      await tx.stockMovement.create({
        data: {
          materialId: item.materialId,
          projectId: transferData.toProjectId || null,
          siteId: transferData.toSiteId || null,
          movementType: 'TRANSFER_IN',
          quantity: item.quantity,
          balanceAfter: toBalance + parseFloat(item.quantity),
          unit: item.unit,
          transferId: newTransfer.id,
          referenceId: newTransfer.id,
          referenceType: 'TRANSFER',
          remarks: `Transfer in from ${newTransfer.fromSite?.siteName || 'project'}: ${transferNumber}`,
          movementDate: transferDate,
        },
      });
    }

    return newTransfer;
  });

  return transfer;
};

module.exports = { getAll, getById, create };
