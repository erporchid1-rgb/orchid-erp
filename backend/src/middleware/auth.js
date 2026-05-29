const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const prisma = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Access token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    if (!user) return sendError(res, 'User not found', 401);
    if (user.status === 'INACTIVE') return sendError(res, 'Account is inactive', 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return sendError(res, 'Token expired', 401);
    if (err.name === 'JsonWebTokenError') return sendError(res, 'Invalid token', 401);
    return sendError(res, 'Authentication failed', 401);
  }
};

module.exports = { authenticate };
