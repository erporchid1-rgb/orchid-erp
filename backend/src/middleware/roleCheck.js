const { sendError } = require('../utils/response');

const ROLE_HIERARCHY = {
  ADMIN: 4,
  STORE_MANAGER: 3,
  ACCOUNTANT: 2,
  SITE_ENGINEER: 1,
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

const requireMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
    if (userLevel < requiredLevel) {
      return sendError(res, 'Insufficient permissions', 403);
    }
    next();
  };
};

module.exports = { requireRole, requireMinRole };
