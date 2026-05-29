const prisma = require('../../config/database');
const { getPagination } = require('../../utils/pagination');
const { generateIssueNumber } = require('../../utils/generateNumber');
const { calculateStock } = require('../stock/stock.service');
const notificationsService = require('../notifications/notifications.service');

const getAll = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const where = {
    ...(query.projectId && { projectId: query.projectId }),
    ...(query.siteId && { siteId: query.siteId }),
    ...(query.status && { status: query.status }),
    ...(query.fromDate && query.toDate && { issueDate: { gte: new Date(query.fromDate), lte: new Date(query.toDate) } }),
  };

  const [issues, total] = await Promise.all([
    prisma.stockIssue.findMany({
      where, skip, take: limit,
      include: {
        project: { select: { id: true, projectName: true } },
        site: { select: { id: true, siteName: true } },
        issuedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        items: { include: { material: { select: { materialName: true, unit: true } } } },
      },
      orderBy: { issueDate: 'desc' },
    }),
    prisma.stockIssue.count({ where }),
  ]);
  return { issues, total, page, limit };
};

const getById = async (id) => {
  const issue = await prisma.stockIssue.findUnique({
    where: { id },
    include: {
      project: true,
      site: true,
      issuedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      items: { include: { material: { include: { category: true } } } },
    },
  });
  if (!issue) throw { status: 404, message: 'Issue not found' };
  return issue;
};

const create = async (data, userId) => {
  const issueNumber = await generateIssueNumber();
  const { items, ...issueData } = data;

  const issue = await prisma.stockIssue.create({
    data: {
      ...issueData,
      issueNumber,
      issuedById: userId,
      items: { create: items },
    },
    include: {
      items: { include: { material: true } },
      issuedBy: { select: { id: true, name: true } },
    },
  });

  return issue;
};

const approve = async (id, userId) => {
  const issue = await prisma.stockIssue.findUnique({ where: { id }, include: { items: { include: { material: true } } } });
  if (!issue) throw { status: 404, message: 'Issue not found' };
  if (issue.status !== 'PENDING') throw { status: 400, message: 'Issue is not in PENDING status' };

  // Validate stock availability for each item
  for (const item of issue.items) {
    const available = await calculateStock(item.materialId, issue.siteId, issue.projectId);
    if (available < parseFloat(item.quantity)) {
      throw { status: 400, message: `Insufficient stock for ${item.material.materialName}. Available: ${available} ${item.material.unit}, Required: ${item.quantity}` };
    }
  }

  const updatedIssue = await prisma.$transaction(async (tx) => {
    const updated = await tx.stockIssue.update({
      where: { id },
      data: { status: 'ISSUED', approvedById: userId },
    });

    // Create stock movements (deductions)
    for (const item of issue.items) {
      const lastMovement = await tx.stockMovement.findFirst({
        where: { materialId: item.materialId, ...(issue.siteId ? { siteId: issue.siteId } : { projectId: issue.projectId }) },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = parseFloat(lastMovement?.balanceAfter || 0);
      const newBalance = currentBalance - parseFloat(item.quantity);

      await tx.stockMovement.create({
        data: {
          materialId: item.materialId,
          projectId: issue.projectId || null,
          siteId: issue.siteId || null,
          movementType: 'ISSUE',
          quantity: item.quantity,
          balanceAfter: Math.max(0, newBalance),
          unit: item.unit,
          issueId: id,
          referenceId: id,
          referenceType: 'ISSUE',
          remarks: `Issued to ${issue.issuedTo}: ${issue.issueNumber}`,
          movementDate: issue.issueDate,
        },
      });
    }

    return updated;
  });

  return updatedIssue;
};

const reject = async (id, userId, remarks) => {
  const issue = await prisma.stockIssue.findUnique({ where: { id } });
  if (!issue) throw { status: 404, message: 'Issue not found' };
  if (issue.status !== 'PENDING') throw { status: 400, message: 'Issue is not in PENDING status' };

  return prisma.stockIssue.update({
    where: { id },
    data: { status: 'REJECTED', approvedById: userId, remarks },
  });
};

module.exports = { getAll, getById, create, approve, reject };
