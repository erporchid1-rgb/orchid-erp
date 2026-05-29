const prisma = require('../../config/database');
const { getPagination, buildSearch } = require('../../utils/pagination');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const search = buildSearch(query.search, ['supplierName', 'email', 'mobile', 'gstNumber']);
  const where = { deletedAt: null, ...(query.isActive !== undefined && { isActive: query.isActive === 'true' }), ...search };

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take: limit, include: { _count: { select: { purchases: true } } }, orderBy: { supplierName: 'asc' } }),
    prisma.supplier.count({ where }),
  ]);
  return { suppliers, total, page, limit };
};

const getById = async (id) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id, deletedAt: null },
    include: {
      purchases: { where: { deletedAt: null }, select: { id: true, billNo: true, totalAmount: true, purchaseDate: true, status: true }, orderBy: { purchaseDate: 'desc' }, take: 10 },
      _count: { select: { purchases: true } },
    },
  });
  if (!supplier) throw { status: 404, message: 'Supplier not found' };
  return supplier;
};

const create = async (data) => {
  return prisma.supplier.create({ data });
};

const update = async (id, data) => {
  const supplier = await prisma.supplier.findUnique({ where: { id, deletedAt: null } });
  if (!supplier) throw { status: 404, message: 'Supplier not found' };
  return prisma.supplier.update({ where: { id }, data });
};

const remove = async (id) => {
  const supplier = await prisma.supplier.findUnique({ where: { id, deletedAt: null } });
  if (!supplier) throw { status: 404, message: 'Supplier not found' };
  return prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
};

const getPurchaseHistory = async (id, query) => {
  const { page, limit, skip } = getPagination(query);
  const where = { supplierId: id, deletedAt: null };
  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({ where, skip, take: limit, include: { items: { include: { material: { select: { materialName: true, unit: true } } } } }, orderBy: { purchaseDate: 'desc' } }),
    prisma.purchase.count({ where }),
  ]);
  return { purchases, total, page, limit };
};

module.exports = { getAll, getById, create, update, remove, getPurchaseHistory };
