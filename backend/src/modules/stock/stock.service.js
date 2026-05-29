const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');

// ─── CORE STOCK CALCULATION ENGINE ─────────────────────────────────────────
// Stock is NEVER stored directly. It's always dynamically calculated
// from the stock_movements ledger. This ensures full auditability.

const calculateStock = async (materialId, siteId = null, projectId = null) => {
  const where = { materialId };
  if (siteId) where.siteId = siteId;
  else if (projectId) where.projectId = projectId;

  const movements = await prisma.stockMovement.findMany({ where, select: { movementType: true, quantity: true } });

  let stock = 0;
  for (const m of movements) {
    const qty = parseFloat(m.quantity);
    if (['PURCHASE', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT'].includes(m.movementType)) stock += qty;
    else stock -= qty;
  }
  return Math.max(0, parseFloat(stock.toFixed(3)));
};

// ─── CURRENT STOCK REPORT ───────────────────────────────────────────────────

const getCurrentStock = async (query) => {
  const { siteId, projectId, categoryId } = query;

  const materialWhere = { deletedAt: null, ...(categoryId && { categoryId }) };
  const materials = await prisma.material.findMany({
    where: materialWhere,
    include: { category: { select: { name: true } } },
    orderBy: { materialName: 'asc' },
  });

  const stockData = await Promise.all(
    materials.map(async (material) => {
      const stock = await calculateStock(material.id, siteId, projectId);
      const isLow = stock <= parseFloat(material.minimumStock);

      // Get last purchase rate for value calculation
      const lastMovement = await prisma.stockMovement.findFirst({
        where: { materialId: material.id, movementType: 'PURCHASE' },
        orderBy: { movementDate: 'desc' },
      });
      const rate = parseFloat(lastMovement?.rate || 0);
      const value = stock * rate;

      return {
        materialId: material.id,
        materialName: material.materialName,
        category: material.category.name,
        unit: material.unit,
        currentStock: stock,
        minimumStock: parseFloat(material.minimumStock),
        stockValue: parseFloat(value.toFixed(2)),
        lastRate: rate,
        isLowStock: isLow,
      };
    })
  );

  return stockData;
};

// ─── STOCK LEDGER (MATERIAL-WISE) ───────────────────────────────────────────

const getStockLedger = async (materialId, query) => {
  const { page, limit, skip } = getPagination(query);
  const { siteId, projectId, fromDate, toDate } = query;

  const where = {
    materialId,
    ...(siteId && { siteId }),
    ...(projectId && { projectId }),
    ...(fromDate && toDate && { movementDate: { gte: new Date(fromDate), lte: new Date(toDate) } }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where, skip, take: limit,
      include: {
        material: { select: { materialName: true, unit: true } },
        site: { select: { siteName: true } },
        project: { select: { projectName: true } },
        purchase: { select: { billNo: true, supplier: { select: { supplierName: true } } } },
      },
      orderBy: { movementDate: 'asc' },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  const material = await prisma.material.findUnique({ where: { id: materialId }, select: { materialName: true, unit: true } });
  return { material, movements, total, page, limit };
};

// ─── LOW STOCK ALERTS ───────────────────────────────────────────────────────

const getLowStockItems = async () => {
  const materials = await prisma.material.findMany({
    where: { deletedAt: null },
    include: { category: { select: { name: true } } },
  });

  const lowStock = [];
  for (const material of materials) {
    const stock = await calculateStock(material.id);
    if (stock <= parseFloat(material.minimumStock)) {
      lowStock.push({
        materialId: material.id,
        materialName: material.materialName,
        category: material.category.name,
        unit: material.unit,
        currentStock: stock,
        minimumStock: parseFloat(material.minimumStock),
        shortage: Math.max(0, parseFloat(material.minimumStock) - stock),
      });
    }
  }
  return lowStock;
};

// ─── DASHBOARD STOCK SUMMARY ────────────────────────────────────────────────

const getStockSummary = async () => {
  const materials = await prisma.material.findMany({ where: { deletedAt: null }, include: { category: true } });
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const material of materials) {
    const stock = await calculateStock(material.id);
    const lastMovement = await prisma.stockMovement.findFirst({ where: { materialId: material.id, movementType: 'PURCHASE' }, orderBy: { movementDate: 'desc' } });
    const rate = parseFloat(lastMovement?.rate || 0);
    totalValue += stock * rate;
    if (stock === 0) outOfStockCount++;
    else if (stock <= parseFloat(material.minimumStock)) lowStockCount++;
  }

  return {
    totalMaterials: materials.length,
    totalStockValue: parseFloat(totalValue.toFixed(2)),
    lowStockCount,
    outOfStockCount,
  };
};

// ─── SITE-WISE STOCK ────────────────────────────────────────────────────────

const getSiteStock = async (siteId) => {
  const site = await prisma.site.findUnique({ where: { id: siteId }, include: { project: { select: { projectName: true } } } });
  if (!site) throw { status: 404, message: 'Site not found' };

  const materialIds = await prisma.stockMovement.findMany({
    where: { siteId },
    distinct: ['materialId'],
    select: { materialId: true },
  });

  const stockData = await Promise.all(
    materialIds.map(async ({ materialId }) => {
      const material = await prisma.material.findUnique({ where: { id: materialId }, include: { category: { select: { name: true } } } });
      const stock = await calculateStock(materialId, siteId);
      return { ...material, currentStock: stock };
    })
  );

  return { site, stock: stockData };
};

const addOpeningStock = async ({ projectId, siteId, items }) => {
  if (!items || items.length === 0) throw { status: 400, message: 'No items provided' };

  const results = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const item of items) {
      const qty = parseFloat(item.quantity);
      if (!qty || qty <= 0) continue;

      const material = await tx.material.findUnique({ where: { id: item.materialId } });
      if (!material) continue;

      // Check if opening stock already exists for this material+location
      const existing = await tx.stockMovement.findFirst({
        where: {
          materialId: item.materialId,
          referenceType: 'OPENING_BALANCE',
          ...(siteId ? { siteId } : { projectId }),
        },
      });
      if (existing) throw { status: 400, message: `Opening stock already set for "${material.materialName}". Delete existing movements first.` };

      const movement = await tx.stockMovement.create({
        data: {
          materialId: item.materialId,
          projectId: projectId || null,
          siteId: siteId || null,
          movementType: 'ADJUSTMENT',
          quantity: qty,
          balanceAfter: qty,
          unit: material.unit,
          rate: parseFloat(item.rate) || 0,
          referenceType: 'OPENING_BALANCE',
          remarks: 'Opening stock entry',
          movementDate: new Date(),
        },
      });
      created.push(movement);
    }
    return created;
  });

  return { count: results.length, movements: results };
};

module.exports = { calculateStock, getCurrentStock, getStockLedger, getLowStockItems, getStockSummary, getSiteStock, addOpeningStock };
