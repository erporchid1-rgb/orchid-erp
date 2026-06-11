const service = require('./comparative.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const path = require('path');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.query);
    return sendPaginated(res, result.comparatives, result.total, result.page, result.limit, 'Comparative Statements fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const cs = await service.getById(req.params.id);
    return sendSuccess(res, cs);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const cs = await service.create(req.body, req.user.id);
    return sendSuccess(res, cs, 'Comparative Statement created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const addQuotation = async (req, res, next) => {
  try {
    const q = await service.addQuotation(req.params.id, req.body);
    return sendSuccess(res, q, 'Quotation added', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const uploadQuotationFile = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const q = await service.updateQuotationFile(req.params.id, req.params.quotationId, req.file.filename);
    return sendSuccess(res, q, 'Quotation file uploaded');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const selectSupplier = async (req, res, next) => {
  try {
    const cs = await service.selectSupplier(req.params.id, req.body.supplierId);
    return sendSuccess(res, cs, 'Supplier selected');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const hodRecommend = async (req, res, next) => {
  try {
    const cs = await service.hodRecommend(req.params.id, req.body.notes, req.user.id);
    return sendSuccess(res, cs, 'CS recommended by Purchase HOD');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const userVerify = async (req, res, next) => {
  try {
    const cs = await service.userVerify(req.params.id, req.user.id);
    return sendSuccess(res, cs, 'CS verified by User Dept');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const presidentVerify = async (req, res, next) => {
  try {
    const cs = await service.presidentVerify(req.params.id, req.user.id);
    return sendSuccess(res, cs, 'CS finally verified by President-Projects');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, addQuotation, uploadQuotationFile, selectSupplier, hodRecommend, userVerify, presidentVerify };
