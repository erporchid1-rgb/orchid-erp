const service = require('./nfa.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.query);
    return sendPaginated(res, result.nfas, result.total, result.page, result.limit, 'NFAs fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const nfa = await service.getById(req.params.id);
    return sendSuccess(res, nfa);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const nfa = await service.create(req.body, req.user.id);
    return sendSuccess(res, nfa, 'NFA created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const uploadDraftPO = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const nfa = await service.uploadDraftPO(req.params.id, req.file.filename);
    return sendSuccess(res, nfa, 'Draft PO uploaded');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const sign = async (req, res, next) => {
  try {
    const { action } = req.body;
    const nfa = await service.sign(req.params.id, action, req.user.id);
    return sendSuccess(res, nfa, 'NFA signed');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const mdAction = async (req, res, next) => {
  try {
    const { action, notes } = req.body;
    const nfa = await service.mdAction(req.params.id, action, notes, req.user.id);
    return sendSuccess(res, nfa, `NFA ${action}d by MD`);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, uploadDraftPO, sign, mdAction };
