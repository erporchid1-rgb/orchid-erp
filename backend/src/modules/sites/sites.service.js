const prisma = require('../../config/database');
const { getPagination, buildSearch } = require('../../utils/pagination');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const search = buildSearch(query.search, ['siteName', 'description']);
  const where = { deletedAt: null, ...(query.projectId && { projectId: query.projectId }), ...search };

  const [sites, total] = await Promise.all([
    prisma.site.findMany({ where, skip, take: limit, include: { project: { select: { id: true, projectName: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.site.count({ where }),
  ]);
  return { sites, total, page, limit };
};

const getById = async (id) => {
  const site = await prisma.site.findUnique({
    where: { id, deletedAt: null },
    include: { project: { select: { id: true, projectName: true, status: true } } },
  });
  if (!site) throw { status: 404, message: 'Site not found' };
  return site;
};

const create = async (data) => {
  const project = await prisma.project.findUnique({ where: { id: data.projectId, deletedAt: null } });
  if (!project) throw { status: 404, message: 'Project not found' };
  return prisma.site.create({ data, include: { project: { select: { id: true, projectName: true } } } });
};

const update = async (id, data) => {
  const site = await prisma.site.findUnique({ where: { id, deletedAt: null } });
  if (!site) throw { status: 404, message: 'Site not found' };
  return prisma.site.update({ where: { id }, data, include: { project: { select: { id: true, projectName: true } } } });
};

const remove = async (id) => {
  const site = await prisma.site.findUnique({ where: { id, deletedAt: null } });
  if (!site) throw { status: 404, message: 'Site not found' };
  return prisma.site.update({ where: { id }, data: { deletedAt: new Date() } });
};

const getByProject = async (projectId) => {
  return prisma.site.findMany({
    where: { projectId, deletedAt: null },
    orderBy: { siteName: 'asc' },
  });
};

module.exports = { getAll, getById, create, update, remove, getByProject };
