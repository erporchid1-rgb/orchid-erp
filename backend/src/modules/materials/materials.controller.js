const materialsService = require('./materials.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { materials, total, page, limit } = await materialsService.getAll(req.query);
    return sendPaginated(res, materials, total, page, limit, 'Materials fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const material = await materialsService.getById(req.params.id);
    return sendSuccess(res, material);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const material = await materialsService.create(req.body);
    return sendSuccess(res, material, 'Material created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const material = await materialsService.update(req.params.id, req.body);
    return sendSuccess(res, material, 'Material updated');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await materialsService.remove(req.params.id);
    return sendSuccess(res, null, 'Material deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const categories = await materialsService.getAllCategories();
    return sendSuccess(res, categories);
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const category = await materialsService.createCategory(req.body);
    return sendSuccess(res, category, 'Category created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, getCategories, createCategory };
