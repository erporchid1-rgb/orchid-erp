const issuesService = require('./issues.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { issues, total, page, limit } = await issuesService.getAll(req.query);
    return sendPaginated(res, issues, total, page, limit, 'Issues fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const issue = await issuesService.getById(req.params.id);
    return sendSuccess(res, issue);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const issue = await issuesService.create(req.body, req.user.id);
    return sendSuccess(res, issue, 'Issue created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const approve = async (req, res, next) => {
  try {
    const issue = await issuesService.approve(req.params.id, req.user.id);
    return sendSuccess(res, issue, 'Issue approved and stock deducted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const issue = await issuesService.reject(req.params.id, req.user.id, req.body.remarks);
    return sendSuccess(res, issue, 'Issue rejected');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, approve, reject };
