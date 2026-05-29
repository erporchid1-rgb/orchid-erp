const prisma = require('../../config/database');

const create = async (userId, title, message, type, data = null) => {
  return prisma.notification.create({ data: { userId, title, message, type, data } });
};

const getUserNotifications = async (userId, query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const where = { userId, ...(query.isRead !== undefined && { isRead: query.isRead === 'true' }) };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
  ]);
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

  return { notifications, total, page, limit, unreadCount };
};

const markAsRead = async (id, userId) => {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
};

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
};

const notifyLowStock = async (material, currentStock) => {
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'STORE_MANAGER'] }, status: 'ACTIVE' } });
  await Promise.all(
    admins.map((user) =>
      create(user.id, 'Low Stock Alert', `${material.materialName} is running low. Current stock: ${currentStock} ${material.unit} (Minimum: ${material.minimumStock})`, 'LOW_STOCK', { materialId: material.id })
    )
  );
};

module.exports = { create, getUserNotifications, markAsRead, markAllAsRead, notifyLowStock };
