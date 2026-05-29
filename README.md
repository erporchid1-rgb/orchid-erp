# Orchid Construction ERP System — Inventory & Stock Management

A complete enterprise-grade ERP system for construction/real estate developer companies to manage materials, purchases, stock movements, and site consumption.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS, Recharts          |
| Backend    | Node.js, Express.js                             |
| Database   | PostgreSQL + Prisma ORM                         |
| Auth       | JWT (Access + Refresh Tokens)                   |
| File Store | Local uploads (Multer)                          |
| PDF        | PDFKit (purchase invoice generation)            |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Install Dependencies
```bash
# Run the setup script (Windows)
setup.bat

# OR manually:
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Database
```bash
# Edit backend/.env and set your DATABASE_URL:
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/construction_erp"
```

### 3. Run Migrations & Seed
```bash
cd backend
npx prisma migrate dev --name init
node prisma/seed.js
```

### 4. Start Development Servers
```bash
# Windows: double-click start-dev.bat
# OR start both manually:

# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api/v1
- **Health Check**: http://localhost:5000/api/health

---

## Default Login Credentials

| Role          | Email                        | Password    |
|---------------|------------------------------|-------------|
| Admin         | admin@orchidconstruction.com          | Admin@123   |
| Store Manager | store@orchidconstruction.com          | Store@123   |
| Site Engineer | engineer@orchidconstruction.com       | Engineer@123|
| Accountant    | accountant@orchidconstruction.com     | Account@123 |

---

## Project Structure

```
ERP/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Complete DB schema
│   │   └── seed.js                # Sample data seeder
│   ├── src/
│   │   ├── app.js                 # Express app setup
│   │   ├── server.js              # HTTP server
│   │   ├── config/
│   │   │   └── database.js        # Prisma client
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT authentication
│   │   │   ├── roleCheck.js       # RBAC middleware
│   │   │   ├── rateLimiter.js     # Rate limiting
│   │   │   ├── upload.js          # Multer file upload
│   │   │   └── errorHandler.js    # Global error handler
│   │   ├── modules/
│   │   │   ├── auth/              # Login, logout, profile
│   │   │   ├── users/             # User management
│   │   │   ├── projects/          # Project CRUD
│   │   │   ├── sites/             # Site/block management
│   │   │   ├── materials/         # Material master
│   │   │   ├── suppliers/         # Vendor management
│   │   │   ├── purchases/         # Purchase orders
│   │   │   ├── stock/             # Stock ledger engine
│   │   │   ├── issues/            # Material issues
│   │   │   ├── transfers/         # Stock transfers
│   │   │   ├── reports/           # Reports + PDF
│   │   │   └── notifications/     # Alerts
│   │   └── utils/
│   │       ├── jwt.js             # Token helpers
│   │       ├── response.js        # API response format
│   │       ├── pagination.js      # Query helpers
│   │       └── generateNumber.js  # Auto-number gen
│   └── uploads/invoices/          # Invoice files
│
└── frontend/
    └── src/
        ├── App.jsx                # Routes
        ├── context/
        │   └── AuthContext.jsx    # Auth state
        ├── hooks/
        │   └── useApi.js          # Async helpers
        ├── layouts/
        │   └── MainLayout.jsx     # App shell
        ├── components/
        │   ├── layout/            # Sidebar, Navbar
        │   └── ui/                # DataTable, Modal, etc.
        ├── pages/
        │   ├── auth/              # Login, Profile
        │   ├── dashboard/         # KPI dashboard
        │   ├── projects/          # Projects CRUD
        │   ├── sites/             # Sites CRUD
        │   ├── materials/         # Materials catalog
        │   ├── suppliers/         # Vendor management
        │   ├── purchases/         # Purchase orders
        │   ├── stock/             # Stock + Ledger
        │   ├── issues/            # Material issues
        │   ├── transfers/         # Stock transfers
        │   ├── reports/           # 5 report pages
        │   ├── users/             # User management
        │   └── notifications/     # Notifications
        ├── services/              # Axios API calls
        └── utils/helpers.js       # Format helpers
```

---

## Core Modules

### 1. Authentication & RBAC
- JWT access tokens + refresh tokens
- 4 roles: Admin, Store Manager, Site Engineer, Accountant
- Route-level and API-level role guards

### 2. Stock Ledger System (Core)
**CRITICAL**: Stock is NEVER stored directly. All stock quantities are computed dynamically from `stock_movements` table.

Movement types:
- `PURCHASE` → increases stock
- `ISSUE` → decreases stock
- `RETURN` → increases stock
- `DAMAGE` → decreases stock
- `TRANSFER_IN` → increases stock at destination
- `TRANSFER_OUT` → decreases stock at source
- `ADJUSTMENT` → manual correction

### 3. Purchase Workflow
```
Draft → Confirmed → Received → (stock movements created)
                ↘ Cancelled
```

### 4. Issue Workflow
```
Site Engineer creates issue (PENDING)
     ↓
Store Manager reviews
     ↓
Approve → ISSUED + stock deducted
Reject → REJECTED
```

### 5. Transfer Workflow
Transfer is atomic — both TRANSFER_OUT and TRANSFER_IN movements are created in one transaction.

---

## API Endpoints

| Module        | Base URL                  |
|---------------|---------------------------|
| Auth          | /api/v1/auth              |
| Users         | /api/v1/users             |
| Projects      | /api/v1/projects          |
| Sites         | /api/v1/sites             |
| Materials     | /api/v1/materials         |
| Suppliers     | /api/v1/suppliers         |
| Purchases     | /api/v1/purchases         |
| Stock         | /api/v1/stock             |
| Issues        | /api/v1/issues            |
| Transfers     | /api/v1/transfers         |
| Reports       | /api/v1/reports           |
| Notifications | /api/v1/notifications     |

---

## Database Schema Summary

- `users` — ERP users with roles
- `refresh_tokens` — JWT refresh token store
- `projects` — 3BHK/4BHK projects
- `sites` — Project sites/blocks
- `categories` — Material categories
- `materials` — Material master
- `suppliers` — Vendor details
- `purchases` — Purchase orders
- `purchase_items` — Line items per PO
- `stock_movements` — **THE LEDGER** (never modify directly)
- `stock_issues` — Issue requests
- `stock_issue_items` — Items per issue
- `stock_transfers` — Transfer records
- `stock_transfer_items` — Items per transfer
- `notifications` — User notifications

---

## Security Features
- bcrypt password hashing (12 rounds)
- JWT with short expiry + refresh rotation
- Rate limiting (100 req/15min global, 10 req/15min auth)
- Helmet.js security headers
- Input validation (express-validator)
- SQL injection prevented by Prisma ORM
- CORS configured for frontend origin only
- Soft deletes (no data loss)
