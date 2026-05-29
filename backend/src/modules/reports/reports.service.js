const prisma = require('../../config/database');
const { calculateStock } = require('../stock/stock.service');

// ─── CURRENT STOCK REPORT ───────────────────────────────────────────────────

const currentStockReport = async (filters) => {
  const { siteId, projectId, categoryId } = filters;
  const where = { deletedAt: null, ...(categoryId && { categoryId }) };
  const materials = await prisma.material.findMany({ where, include: { category: { select: { name: true } } }, orderBy: { materialName: 'asc' } });

  const report = await Promise.all(
    materials.map(async (m) => {
      const stock = await calculateStock(m.id, siteId, projectId);
      const lastMovement = await prisma.stockMovement.findFirst({ where: { materialId: m.id, movementType: 'PURCHASE' }, orderBy: { movementDate: 'desc' } });
      return { materialName: m.materialName, category: m.category.name, unit: m.unit, currentStock: stock, minimumStock: parseFloat(m.minimumStock), stockValue: stock * parseFloat(lastMovement?.rate || 0), isLowStock: stock <= parseFloat(m.minimumStock) };
    })
  );
  return report;
};

// ─── LOW STOCK REPORT ───────────────────────────────────────────────────────

const lowStockReport = async () => {
  const materials = await prisma.material.findMany({ where: { deletedAt: null }, include: { category: { select: { name: true } } } });
  const lowStock = [];
  for (const m of materials) {
    const stock = await calculateStock(m.id);
    if (stock <= parseFloat(m.minimumStock)) {
      lowStock.push({ materialName: m.materialName, category: m.category.name, unit: m.unit, currentStock: stock, minimumStock: parseFloat(m.minimumStock), shortage: parseFloat(m.minimumStock) - stock });
    }
  }
  return lowStock;
};

// ─── SUPPLIER PURCHASE REPORT ───────────────────────────────────────────────

const supplierPurchaseReport = async (filters) => {
  const { supplierId, fromDate, toDate } = filters;
  const where = {
    deletedAt: null,
    status: 'RECEIVED',
    ...(supplierId && { supplierId }),
    ...(fromDate && toDate && { purchaseDate: { gte: new Date(fromDate), lte: new Date(toDate) } }),
  };

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: { select: { supplierName: true, gstNumber: true } }, items: { include: { material: { select: { materialName: true, unit: true } } } } },
    orderBy: { purchaseDate: 'desc' },
  });

  const summary = await prisma.purchase.groupBy({
    by: ['supplierId'],
    where,
    _sum: { totalAmount: true },
    _count: true,
  });

  return { purchases, summary };
};

// ─── SITE CONSUMPTION REPORT ────────────────────────────────────────────────

const siteConsumptionReport = async (filters) => {
  const { siteId, projectId, fromDate, toDate } = filters;
  const where = {
    movementType: 'ISSUE',
    ...(siteId && { siteId }),
    ...(projectId && { projectId }),
    ...(fromDate && toDate && { movementDate: { gte: new Date(fromDate), lte: new Date(toDate) } }),
  };

  const movements = await prisma.stockMovement.findMany({
    where,
    include: { material: { include: { category: { select: { name: true } } } }, site: { select: { siteName: true } }, project: { select: { projectName: true } } },
    orderBy: { movementDate: 'desc' },
  });

  const grouped = {};
  for (const m of movements) {
    const key = m.materialId;
    if (!grouped[key]) {
      grouped[key] = { materialName: m.material.materialName, category: m.material.category.name, unit: m.material.unit, totalConsumed: 0, rate: parseFloat(m.rate || 0), totalValue: 0 };
    }
    grouped[key].totalConsumed += parseFloat(m.quantity);
    grouped[key].totalValue += parseFloat(m.quantity) * parseFloat(m.rate || 0);
  }

  return { movements, summary: Object.values(grouped) };
};

// ─── DAILY PURCHASE REPORT ──────────────────────────────────────────────────

const dailyPurchaseReport = async (filters) => {
  const { fromDate, toDate, projectId } = filters;
  const where = {
    deletedAt: null,
    status: 'RECEIVED',
    ...(projectId && { projectId }),
    ...(fromDate && toDate && { purchaseDate: { gte: new Date(fromDate), lte: new Date(toDate) } }),
  };

  return prisma.purchase.findMany({
    where,
    include: {
      supplier: { select: { supplierName: true } },
      project: { select: { projectName: true } },
      site: { select: { siteName: true } },
      items: { include: { material: { select: { materialName: true } } } },
    },
    orderBy: { purchaseDate: 'desc' },
  });
};

// ─── MONTHLY USAGE REPORT ───────────────────────────────────────────────────

const monthlyUsageReport = async (year) => {
  const startDate = new Date(`${year}-01-01`);
  const endDate = new Date(`${year}-12-31`);

  const movements = await prisma.stockMovement.groupBy({
    by: ['movementType'],
    where: { movementDate: { gte: startDate, lte: endDate } },
    _sum: { quantity: true },
    _count: true,
  });

  const monthlyData = [];
  for (let month = 0; month < 12; month++) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    const purchases = await prisma.purchase.aggregate({
      where: { deletedAt: null, status: 'RECEIVED', purchaseDate: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: true,
    });

    const issues = await prisma.stockIssue.count({
      where: { status: 'ISSUED', issueDate: { gte: start, lte: end } },
    });

    monthlyData.push({
      month: month + 1,
      monthName: start.toLocaleString('default', { month: 'long' }),
      purchaseAmount: parseFloat(purchases._sum.totalAmount || 0),
      purchaseCount: purchases._count,
      issueCount: issues,
    });
  }

  return monthlyData;
};

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

const getDashboardStats = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [totalMaterials, totalSuppliers, totalProjects, monthlyPurchases, yearPurchases, pendingIssues, lowStockCount] = await Promise.all([
    prisma.material.count({ where: { deletedAt: null } }),
    prisma.supplier.count({ where: { deletedAt: null, isActive: true } }),
    prisma.project.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.purchase.aggregate({ where: { deletedAt: null, status: 'RECEIVED', purchaseDate: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
    prisma.purchase.aggregate({ where: { deletedAt: null, status: 'RECEIVED', purchaseDate: { gte: startOfYear } }, _sum: { totalAmount: true } }),
    prisma.stockIssue.count({ where: { status: 'PENDING' } }),
    (async () => {
      const materials = await prisma.material.findMany({ where: { deletedAt: null } });
      let count = 0;
      for (const m of materials) {
        const stock = await calculateStock(m.id);
        if (stock <= parseFloat(m.minimumStock)) count++;
      }
      return count;
    })(),
  ]);

  const recentPurchases = await prisma.purchase.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { supplier: { select: { supplierName: true } }, project: { select: { projectName: true } } },
  });

  // Monthly purchase chart data (last 6 months)
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const agg = await prisma.purchase.aggregate({ where: { deletedAt: null, status: 'RECEIVED', purchaseDate: { gte: start, lte: end } }, _sum: { totalAmount: true } });
    chartData.push({ month: start.toLocaleString('default', { month: 'short' }), amount: parseFloat(agg._sum.totalAmount || 0) });
  }

  return {
    totalMaterials,
    totalSuppliers,
    activeProjects: totalProjects,
    monthlyPurchaseAmount: parseFloat(monthlyPurchases._sum.totalAmount || 0),
    monthlyPurchaseCount: monthlyPurchases._count,
    yearlyPurchaseAmount: parseFloat(yearPurchases._sum.totalAmount || 0),
    pendingIssues,
    lowStockCount,
    recentPurchases,
    purchaseChartData: chartData,
  };
};

module.exports = { currentStockReport, lowStockReport, supplierPurchaseReport, siteConsumptionReport, dailyPurchaseReport, monthlyUsageReport, getDashboardStats };
