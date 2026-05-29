const transfersService = require('./transfers.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { transfers, total, page, limit } = await transfersService.getAll(req.query);
    return sendPaginated(res, transfers, total, page, limit, 'Transfers fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const transfer = await transfersService.getById(req.params.id);
    return sendSuccess(res, transfer);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const transfer = await transfersService.create(req.body, req.user.id);
    return sendSuccess(res, transfer, 'Transfer completed', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create };
