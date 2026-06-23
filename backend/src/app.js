require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const sitesRoutes = require('./modules/sites/sites.routes');
const materialsRoutes = require('./modules/materials/materials.routes');
const suppliersRoutes = require('./modules/suppliers/suppliers.routes');
const purchasesRoutes = require('./modules/purchases/purchases.routes');
const stockRoutes = require('./modules/stock/stock.routes');
const issuesRoutes = require('./modules/issues/issues.routes');
const transfersRoutes = require('./modules/transfers/transfers.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const indentsRoutes = require('./modules/indents/indents.routes');
const comparativeRoutes = require('./modules/comparative/comparative.routes');
const nfaRoutes = require('./modules/nfa/nfa.routes');
const mrnRoutes = require('./modules/mrn/mrn.routes');

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://orchiderp.netlify.app',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : []),
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── General Middleware ────────────────────────────────────────────────────────
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalLimiter);

// ── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Construction ERP API is running', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, usersRoutes);
app.use(`${API}/projects`, projectsRoutes);
app.use(`${API}/sites`, sitesRoutes);
app.use(`${API}/materials`, materialsRoutes);
app.use(`${API}/suppliers`, suppliersRoutes);
app.use(`${API}/purchases`, purchasesRoutes);
app.use(`${API}/stock`, stockRoutes);
app.use(`${API}/issues`, issuesRoutes);
app.use(`${API}/transfers`, transfersRoutes);
app.use(`${API}/reports`, reportsRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/indents`, indentsRoutes);
app.use(`${API}/comparative`, comparativeRoutes);
app.use(`${API}/nfa`, nfaRoutes);
app.use(`${API}/mrn`, mrnRoutes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
