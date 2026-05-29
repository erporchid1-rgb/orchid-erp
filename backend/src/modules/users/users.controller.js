const usersService = require('./users.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { users, total, page, limit } = await usersService.getAllUsers(req.query);
    return sendPaginated(res, users, total, page, limit, 'Users fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.params.id);
    return sendSuccess(res, user);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const user = await usersService.createUser(req.body);
    return sendSuccess(res, user, 'User created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const user = await usersService.updateUser(req.params.id, req.body);
    return sendSuccess(res, user, 'User updated');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await usersService.deleteUser(req.params.id, req.user.id);
    return sendSuccess(res, null, 'User deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
