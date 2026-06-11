const express = require('express');
const reportsService = require('./reports.service');
const { sendSuccess } = require('../../utils/response');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/dashboard', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.getDashboardStats()); } catch (err) { next(err); }
});

router.get('/current-stock', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.currentStockReport(req.query)); } catch (err) { next(err); }
});

router.get('/low-stock', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.lowStockReport()); } catch (err) { next(err); }
});

router.get('/supplier-purchases', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.supplierPurchaseReport(req.query)); } catch (err) { next(err); }
});

router.get('/site-consumption', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.siteConsumptionReport(req.query)); } catch (err) { next(err); }
});

router.get('/daily-purchases', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.dailyPurchaseReport(req.query)); } catch (err) { next(err); }
});

router.get('/monthly-usage', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    return sendSuccess(res, await reportsService.monthlyUsageReport(year));
  } catch (err) { next(err); }
});

router.get('/my-pending', async (req, res, next) => {
  try { return sendSuccess(res, await reportsService.getMyPending(req.user.id, req.user.role)); } catch (err) { next(err); }
});

module.exports = router;
