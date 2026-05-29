const indentsService = require('./indents.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await indentsService.getAll(req.query, req.user.id, req.user.role);
    return sendPaginated(res, result.indents, result.total, result.page, result.limit, 'Indents fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const indent = await indentsService.getById(req.params.id);
    return sendSuccess(res, indent);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.requiredDate) body.requiredDate = new Date(body.requiredDate);
    const indent = await indentsService.create(body, req.user.id);
    return sendSuccess(res, indent, 'Indent raised successfully', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const approve = async (req, res, next) => {
  try {
    const indent = await indentsService.approve(req.params.id, req.body.notes, req.user.id);
    return sendSuccess(res, indent, 'Indent approved');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const indent = await indentsService.reject(req.params.id, req.body.notes, req.user.id);
    return sendSuccess(res, indent, 'Indent rejected');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, approve, reject };
