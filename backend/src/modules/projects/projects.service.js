const prisma = require('../../config/database');
const { getPagination, buildSearch } = require('../../utils/pagination');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const search = buildSearch(query.search, ['projectName', 'location']);
  const where = { deletedAt: null, ...(query.status && { status: query.status }), ...(query.projectType && { projectType: query.projectType }), ...search };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({ where, skip, take: limit, include: { sites: { where: { deletedAt: null }, select: { id: true, siteName: true } }, _count: { select: { purchases: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.project.count({ where }),
  ]);
  return { projects, total, page, limit };
};

const getById = async (id) => {
  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: { sites: { where: { deletedAt: null } }, _count: { select: { purchases: true, stockIssues: true } } },
  });
  if (!project) throw { status: 404, message: 'Project not found' };
  return project;
};

const create = async (data) => {
  return prisma.project.create({ data, include: { sites: true } });
};

const update = async (id, data) => {
  const project = await prisma.project.findUnique({ where: { id, deletedAt: null } });
  if (!project) throw { status: 404, message: 'Project not found' };
  return prisma.project.update({ where: { id }, data });
};

const remove = async (id) => {
  const project = await prisma.project.findUnique({ where: { id, deletedAt: null } });
  if (!project) throw { status: 404, message: 'Project not found' };
  return prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
};

const getStats = async (id) => {
  const project = await prisma.project.findUnique({ where: { id, deletedAt: null } });
  if (!project) throw { status: 404, message: 'Project not found' };

  const [purchases, issues, movements] = await Promise.all([
    prisma.purchase.aggregate({ where: { projectId: id, deletedAt: null }, _sum: { totalAmount: true }, _count: true }),
    prisma.stockIssue.count({ where: { projectId: id } }),
    prisma.stockMovement.count({ where: { projectId: id } }),
  ]);

  return { totalPurchaseValue: purchases._sum.totalAmount || 0, purchaseCount: purchases._count, issueCount: issues, movementCount: movements };
};

module.exports = { getAll, getById, create, update, remove, getStats };
