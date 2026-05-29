const purchasesService = require('./purchases.service');
const pdfService = require('../reports/pdf.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');
const { validationResult } = require('express-validator');

const getAll = async (req, res, next) => {
  try {
    const { purchases, total, page, limit } = await purchasesService.getAll(req.query);
    return sendPaginated(res, purchases, total, page, limit, 'Purchases fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const purchase = await purchasesService.getById(req.params.id);
    return sendSuccess(res, purchase);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendError(res, 'Validation failed', 400, errors.array());
    const purchase = await purchasesService.create(req.body, req.user.id);
    return sendSuccess(res, purchase, 'Purchase created', 201);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return sendError(res, 'Status is required', 400);
    // Site engineers can only mark as RECEIVED
    if (req.user.role === 'SITE_ENGINEER' && status !== 'RECEIVED') {
      return sendError(res, 'Not authorized', 403);
    }
    const purchase = await purchasesService.updateStatus(req.params.id, status, req.user.id);
    return sendSuccess(res, purchase, 'Status updated');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const submitForApproval = async (req, res, next) => {
  try {
    const purchase = await purchasesService.submitForApproval(req.params.id, req.user.id);
    return sendSuccess(res, purchase, 'Submitted for management approval');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const approvePurchase = async (req, res, next) => {
  try {
    const purchase = await purchasesService.approvePurchase(req.params.id, req.body.notes, req.user.id);
    return sendSuccess(res, purchase, 'Purchase approved');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const rejectPurchase = async (req, res, next) => {
  try {
    const purchase = await purchasesService.rejectPurchase(req.params.id, req.body.notes, req.user.id);
    return sendSuccess(res, purchase, 'Purchase rejected');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const uploadQuotation = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'File is required', 400);
    const num = parseInt(req.params.num);
    if (![1, 2, 3].includes(num)) return sendError(res, 'Quotation number must be 1, 2, or 3', 400);
    const purchase = await purchasesService.uploadQuotation(req.params.id, num, req.file.filename);
    return sendSuccess(res, purchase, `Quotation ${num} uploaded`);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const uploadInvoice = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, 'Invoice file is required', 400);
    const purchase = await purchasesService.uploadInvoice(req.params.id, req.file.filename);
    return sendSuccess(res, purchase, 'Invoice uploaded');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const generatePDF = async (req, res, next) => {
  try {
    const purchase = await purchasesService.getById(req.params.id);
    await pdfService.generatePurchaseInvoice(purchase, res);
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await purchasesService.remove(req.params.id);
    return sendSuccess(res, null, 'Purchase deleted');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getAll, getById, create, updateStatus, submitForApproval, approvePurchase, rejectPurchase, uploadQuotation, uploadInvoice, generatePDF, remove };
