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

const submitToHOD = async (req, res, next) => {
  try {
    const indent = await indentsService.submitToHOD(req.params.id, req.user.id);
    return sendSuccess(res, indent, 'Indent submitted to HOD for approval');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const hodAction = async (req, res, next) => {
  try {
    const { action, notes } = req.body;
    const indent = await indentsService.hodAction(req.params.id, action, notes, req.user.id);
    return sendSuccess(res, indent, `Indent ${action}d by HOD`);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const purchaseHodAction = async (req, res, next) => {
  try {
    const { action, notes } = req.body;
    const indent = await indentsService.purchaseHodAction(req.params.id, action, notes, req.user.id);
    return sendSuccess(res, indent, `Indent ${action}ed by Purchase HOD`);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const indent = await indentsService.update(req.params.id, req.body);
    return sendSuccess(res, indent, 'Indent updated successfully');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, update, submitToHOD, hodAction, purchaseHodAction };
