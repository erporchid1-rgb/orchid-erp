import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import { PageLoader } from './components/ui/LoadingSpinner'

// Auth pages
import LoginPage from './pages/auth/LoginPage'

// Main pages
import Dashboard from './pages/dashboard/Dashboard'
import ProjectsPage from './pages/projects/ProjectsPage'
import SitesPage from './pages/sites/SitesPage'
import MaterialsPage from './pages/materials/MaterialsPage'
import SuppliersPage from './pages/suppliers/SuppliersPage'
import PurchasesPage from './pages/purchases/PurchasesPage'
import PurchaseDetailPage from './pages/purchases/PurchaseDetailPage'
import CreatePurchasePage from './pages/purchases/CreatePurchasePage'
import StockPage from './pages/stock/StockPage'
import StockLedgerPage from './pages/stock/StockLedgerPage'
import OpeningStockPage from './pages/stock/OpeningStockPage'
import IssuesPage from './pages/issues/IssuesPage'
import CreateIssuePage from './pages/issues/CreateIssuePage'
import TransfersPage from './pages/transfers/TransfersPage'
import CreateTransferPage from './pages/transfers/CreateTransferPage'
import IndentsPage from './pages/indents/IndentsPage'
import CreateIndentPage from './pages/indents/CreateIndentPage'
import IndentDetailPage from './pages/indents/IndentDetailPage'
import UsersPage from './pages/users/UsersPage'
import ProfilePage from './pages/auth/ProfilePage'
import NotificationsPage from './pages/notifications/NotificationsPage'

// Reports
import StockReportPage from './pages/reports/StockReportPage'
import PurchaseReportPage from './pages/reports/PurchaseReportPage'
import ConsumptionReportPage from './pages/reports/ConsumptionReportPage'
import LowStockReportPage from './pages/reports/LowStockReportPage'
import MonthlyReportPage from './pages/reports/MonthlyReportPage'

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

    <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="projects" element={<ProjectsPage />} />
      <Route path="sites" element={<SitesPage />} />
      <Route path="materials" element={<MaterialsPage />} />
      <Route path="suppliers" element={<SuppliersPage />} />
      <Route path="purchases" element={<PurchasesPage />} />
      <Route path="purchases/new" element={<CreatePurchasePage />} />
      <Route path="purchases/:id" element={<PurchaseDetailPage />} />
      <Route path="stock" element={<StockPage />} />
      <Route path="stock/ledger/:materialId" element={<StockLedgerPage />} />
      <Route path="stock/opening" element={<ProtectedRoute roles={['ADMIN']}><OpeningStockPage /></ProtectedRoute>} />
      <Route path="issues" element={<IssuesPage />} />
      <Route path="issues/new" element={<CreateIssuePage />} />
      <Route path="transfers" element={<TransfersPage />} />
      <Route path="transfers/new" element={<CreateTransferPage />} />
      <Route path="indents" element={<IndentsPage />} />
      <Route path="indents/new" element={<CreateIndentPage />} />
      <Route path="indents/:id" element={<IndentDetailPage />} />
      <Route path="reports/stock" element={<StockReportPage />} />
      <Route path="reports/purchases" element={<PurchaseReportPage />} />
      <Route path="reports/consumption" element={<ConsumptionReportPage />} />
      <Route path="reports/low-stock" element={<LowStockReportPage />} />
      <Route path="reports/monthly" element={<MonthlyReportPage />} />
      <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
)

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
)

export default App
