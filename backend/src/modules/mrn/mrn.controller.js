const service = require('./mrn.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.query);
    return sendPaginated(res, result.mrns, result.total, result.page, result.limit, 'MRNs fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const mrn = await service.getById(req.params.id);
    return sendSuccess(res, mrn);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const mrn = await service.create(req.body, req.user.id);
    return sendSuccess(res, mrn, 'MRN created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);
    const doc = await service.uploadDocument(req.params.id, req.body.docType || 'OTHER', req.file.filename);
    return sendSuccess(res, doc, 'Document uploaded', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const storeVerify = async (req, res, next) => {
  try {
    const mrn = await service.storeVerify(req.params.id, req.user.id);
    return sendSuccess(res, mrn, 'MRN verified by Store');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const purchaseHodVerify = async (req, res, next) => {
  try {
    const mrn = await service.purchaseHodVerify(req.params.id, req.user.id);
    return sendSuccess(res, mrn, 'MRN verified and forwarded to Finance');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const closePO = async (req, res, next) => {
  try {
    const mrn = await service.closePO(req.params.id);
    return sendSuccess(res, mrn, 'PO closed');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, uploadDocument, storeVerify, purchaseHodVerify, closePO };
