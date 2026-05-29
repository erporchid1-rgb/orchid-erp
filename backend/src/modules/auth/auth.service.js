const bcrypt = require('bcryptjs');
const prisma = require('../../config/database');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../../utils/jwt');

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  if (!user) throw { status: 401, message: 'Invalid email or password' };
  if (user.status === 'INACTIVE') throw { status: 403, message: 'Account is inactive. Contact administrator.' };

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw { status: 401, message: 'Invalid email or password' };

  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, accessToken, refreshToken };
};

const refreshToken = async (token) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { token } });
    throw { status: 401, message: 'Refresh token expired or invalid' };
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id, deletedAt: null } });
  if (!user) throw { status: 401, message: 'User not found' };

  const payload = { id: user.id, email: user.email, role: user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  await prisma.refreshToken.update({ where: { token }, data: { token: newRefreshToken, expiresAt } });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

const logout = async (token) => {
  await prisma.refreshToken.deleteMany({ where: { token } });
};

const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, mobile: true, role: true, status: true, avatar: true, lastLoginAt: true, createdAt: true },
  });
  if (!user) throw { status: 404, message: 'User not found' };
  return user;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw { status: 404, message: 'User not found' };

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) throw { status: 400, message: 'Current password is incorrect' };

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
};

module.exports = { login, refreshToken, logout, getProfile, changePassword };
