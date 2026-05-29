const stockService = require('./stock.service');
const { sendSuccess, sendError, sendPaginated } = require('../../utils/response');

const getCurrentStock = async (req, res, next) => {
  try {
    const stock = await stockService.getCurrentStock(req.query);
    return sendSuccess(res, stock, 'Current stock fetched');
  } catch (err) { next(err); }
};

const getStockLedger = async (req, res, next) => {
  try {
    const { material, movements, total, page, limit } = await stockService.getStockLedger(req.params.materialId, req.query);
    return sendPaginated(res, { material, movements }, total, page, limit, 'Stock ledger fetched');
  } catch (err) { next(err); }
};

const getLowStock = async (req, res, next) => {
  try {
    const items = await stockService.getLowStockItems();
    return sendSuccess(res, items, 'Low stock items fetched');
  } catch (err) { next(err); }
};

const getStockSummary = async (req, res, next) => {
  try {
    const summary = await stockService.getStockSummary();
    return sendSuccess(res, summary, 'Stock summary fetched');
  } catch (err) { next(err); }
};

const getSiteStock = async (req, res, next) => {
  try {
    const data = await stockService.getSiteStock(req.params.siteId);
    return sendSuccess(res, data, 'Site stock fetched');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

const addOpeningStock = async (req, res, next) => {
  try {
    const result = await stockService.addOpeningStock(req.body);
    return sendSuccess(res, result, 'Opening stock added successfully');
  } catch (err) {
    if (err.status) return sendError(res, err.message, err.status);
    next(err);
  }
};

module.exports = { getCurrentStock, getStockLedger, getLowStock, getStockSummary, getSiteStock, addOpeningStock };
