const suppliersService = require('./suppliers.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { suppliers, total, page, limit } = await suppliersService.getAll(req.query);
    return sendPaginated(res, suppliers, total, page, limit, 'Suppliers fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const supplier = await suppliersService.getById(req.params.id);
    return sendSuccess(res, supplier);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const supplier = await suppliersService.create(req.body);
    return sendSuccess(res, supplier, 'Supplier created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const supplier = await suppliersService.update(req.params.id, req.body);
    return sendSuccess(res, supplier, 'Supplier updated');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await suppliersService.remove(req.params.id);
    return sendSuccess(res, null, 'Supplier deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const getPurchaseHistory = async (req, res, next) => {
  try {
    const { purchases, total, page, limit } = await suppliersService.getPurchaseHistory(req.params.id, req.query);
    return sendPaginated(res, purchases, total, page, limit);
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, getPurchaseHistory };
