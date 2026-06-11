const { sendError } = require('../utils/response');

// Role hierarchy — higher number = more authority
const ROLE_HIERARCHY = {
  SITE_ENGINEER:      1,
  STORE_MANAGER:      2,
  INCHARGE:           3,
  ACCOUNTANT:         3,
  FINANCE:            4,
  USER_HOD:           5,
  PURCHASE_HOD:       6,
  GM_PURCHASE:        7,
  CFO:                7,
  PRESIDENT_PROJECTS: 8,
  EXE_DIRECTOR:       9,
  MD:                 10,
  ADMIN:              11,
};

// Roles that can create/submit indents
const INDENT_CREATORS = ['STORE_MANAGER', 'INCHARGE', 'SITE_ENGINEER', 'ADMIN'];

// Roles that handle Purchase-dept work
const PURCHASE_ROLES = ['PURCHASE_HOD', 'GM_PURCHASE', 'ADMIN'];

// Roles that see Finance data
const FINANCE_ROLES = ['FINANCE', 'ACCOUNTANT', 'CFO', 'ADMIN'];

// All senior approvers
const SENIOR_ROLES = ['USER_HOD', 'PURCHASE_HOD', 'GM_PURCHASE', 'CFO',
                      'PRESIDENT_PROJECTS', 'EXE_DIRECTOR', 'MD', 'ADMIN'];

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  if (!roles.includes(req.user.role)) return sendError(res, 'Insufficient permissions', 403);
  next();
};

const requireMinRole = (minRole) => (req, res, next) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const required  = ROLE_HIERARCHY[minRole] || 0;
  if (userLevel < required) return sendError(res, 'Insufficient permissions', 403);
  next();
};

module.exports = {
  requireRole,
  requireMinRole,
  ROLE_HIERARCHY,
  INDENT_CREATORS,
  PURCHASE_ROLES,
  FINANCE_ROLES,
  SENIOR_ROLES,
};
