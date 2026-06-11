const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { getPagination, buildSearch } = require('../../utils/pagination');

const getAllUsers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const search = buildSearch(query.search, ['name', 'email', 'mobile']);
  const where = { deletedAt: null, ...(query.role && { role: query.role }), ...(query.status && { status: query.status }), ...search };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, select: { id: true, name: true, email: true, mobile: true, role: true, status: true, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  return { users, total, page, limit };
};

const getUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null }, select: { id: true, name: true, email: true, mobile: true, role: true, status: true, createdAt: true, updatedAt: true } });
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};

const createUser = async (data) => {
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw { status: 409, message: 'Email already in use' };
  const hashedPassword = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: { ...data, email: data.email.toLowerCase(), password: hashedPassword },
    select: { id: true, name: true, email: true, mobile: true, role: true, status: true, createdAt: true },
  });
};

const updateUser = async (id, data) => {
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) throw { status: 404, message: 'User not found' };
  if (data.email) {
    const exists = await prisma.user.findFirst({ where: { email: data.email.toLowerCase(), id: { not: id } } });
    if (exists) throw { status: 409, message: 'Email already in use' };
  }
  const updateData = { ...data };
  delete updateData.password;  // always strip; only re-add if explicitly provided
  if (data.password && data.password.length >= 8) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }
  return prisma.user.update({ where: { id }, data: updateData, select: { id: true, name: true, email: true, mobile: true, role: true, status: true } });
};

const deleteUser = async (id, requesterId) => {
  if (id === requesterId) throw { status: 400, message: 'Cannot delete your own account' };
  const user = await prisma.user.findUnique({ where: { id, deletedAt: null } });
  if (!user) throw { status: 404, message: 'User not found' };
  return prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
};

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser };
