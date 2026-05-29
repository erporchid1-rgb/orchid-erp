const prisma = require('../../config/database');
const { getPagination, buildSearch } = require('../../utils/pagination');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const search = buildSearch(query.search, ['materialName', 'description', 'hsnCode']);
  const where = { deletedAt: null, ...(query.categoryId && { categoryId: query.categoryId }), ...(query.unit && { unit: query.unit }), ...search };

  const [materials, total] = await Promise.all([
    prisma.material.findMany({ where, skip, take: limit, include: { category: { select: { id: true, name: true } } }, orderBy: { materialName: 'asc' } }),
    prisma.material.count({ where }),
  ]);
  return { materials, total, page, limit };
};

const getById = async (id) => {
  const material = await prisma.material.findUnique({
    where: { id, deletedAt: null },
    include: { category: true },
  });
  if (!material) throw { status: 404, message: 'Material not found' };
  return material;
};

const create = async (data) => {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw { status: 404, message: 'Category not found' };
  return prisma.material.create({ data, include: { category: true } });
};

const update = async (id, data) => {
  const material = await prisma.material.findUnique({ where: { id, deletedAt: null } });
  if (!material) throw { status: 404, message: 'Material not found' };
  return prisma.material.update({ where: { id }, data, include: { category: true } });
};

const remove = async (id) => {
  const material = await prisma.material.findUnique({ where: { id, deletedAt: null } });
  if (!material) throw { status: 404, message: 'Material not found' };
  return prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
};

// Categories
const getAllCategories = async () => prisma.category.findMany({ orderBy: { name: 'asc' } });

const createCategory = async (data) => {
  const exists = await prisma.category.findUnique({ where: { name: data.name } });
  if (exists) throw { status: 409, message: 'Category already exists' };
  return prisma.category.create({ data });
};

const getCurrentStock = async (materialId, siteId, projectId) => {
  const where = { materialId, ...(siteId && { siteId }), ...(projectId && { projectId }) };
  const result = await prisma.stockMovement.aggregate({
    where,
    _sum: { quantity: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where,
    select: { movementType: true, quantity: true },
  });

  let stock = 0;
  for (const m of movements) {
    if (['PURCHASE', 'RETURN', 'TRANSFER_IN', 'ADJUSTMENT'].includes(m.movementType)) {
      stock += parseFloat(m.quantity);
    } else {
      stock -= parseFloat(m.quantity);
    }
  }
  return Math.max(0, stock);
};

module.exports = { getAll, getById, create, update, remove, getAllCategories, createCategory, getCurrentStock };
