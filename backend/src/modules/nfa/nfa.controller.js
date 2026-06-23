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
    const { action, signature } = req.body;
    const nfa = await service.sign(req.params.id, action, req.user.id, signature || null);
    return sendSuccess(res, nfa, 'NFA signed');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const mdAction = async (req, res, next) => {
  try {
    const { action, notes, signature, approvalMode, mdUserId } = req.body;
    const isMD = ['MD', 'ADMIN'].includes(req.user.role);
    // If a purchase role is recording on behalf of MD, mdUserId must be provided
    const effectiveMdUserId = isMD ? req.user.id : (mdUserId || req.user.id);
    const recordedById = isMD ? null : req.user.id;
    const nfa = await service.mdAction(
      req.params.id, action, notes,
      effectiveMdUserId, signature || null,
      approvalMode || (isMD ? 'DIGITAL' : null),
      recordedById
    );
    return sendSuccess(res, nfa, `NFA ${action}d`);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const nfa = await service.update(req.params.id, req.body);
    return sendSuccess(res, nfa, 'NFA updated successfully');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, update, uploadDraftPO, sign, mdAction };
