const express = require('express');
const stockController = require('./stock.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');

const router = express.Router();
router.use(authenticate);

router.get('/current', stockController.getCurrentStock);
router.get('/summary', stockController.getStockSummary);
router.get('/low-stock', stockController.getLowStock);
router.get('/ledger/:materialId', stockController.getStockLedger);
router.get('/site/:siteId', stockController.getSiteStock);
router.post('/opening', requireRole('ADMIN'), stockController.addOpeningStock);

module.exports = router;
