import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Assets = lazy(() => import('./pages/Assets.jsx'));
const AssetDetail = lazy(() => import('./pages/AssetDetail.jsx'));
const AssetForm = lazy(() => import('./pages/AssetForm.jsx'));
const Assignments = lazy(() => import('./pages/Assignments.jsx'));
const Maintenance = lazy(() => import('./pages/Maintenance.jsx'));
const AuditLog = lazy(() => import('./pages/AuditLog.jsx'));
const Scan = lazy(() => import('./pages/Scan.jsx'));
const Documents = lazy(() => import('./components/Documents.jsx'));
const Accessories = lazy(() => import('./pages/Accessories.jsx'));
const Consumables = lazy(() => import('./pages/Consumables.jsx'));
const Licenses = lazy(() => import('./pages/Licenses.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const UserDashboard = lazy(() => import('./pages/UserDashboard.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));
const Requirements = lazy(() => import('./pages/Requirements.jsx'));
const SuperDashboard = lazy(() => import('./pages/SuperDashboard.jsx'));
const RequestableItems = lazy(() => import('./pages/RequestableItems.jsx'));
const ResourcePage = lazy(() => import('./pages/ResourcePage.jsx'));
const Import = lazy(() => import('./pages/Import.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg)] text-accent stencil text-sm">
        Loading workspace...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function hasMenuAccess(user, accessKey) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return Array.isArray(user.menuAccess) ? user.menuAccess.includes(accessKey) : false;
}

function MenuAccessRoute({ children, accessKey }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg)] text-accent stencil text-sm">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!hasMenuAccess(user, accessKey)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();   

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg)] text-accent stencil text-sm">
        Loading workspace...
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : children;
}

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === 'asset_user') return <Navigate to="/my-assets" replace />;
  return <Dashboard />;
}

function SuperOnlyRoute() {
  const { user } = useAuth();
  return user?.role === 'superadmin' ? <SuperDashboard /> : <Navigate to="/" replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center">
        <div className="stencil text-5xl font-bold text-accent">404</div>
        <h1 className="stencil mt-4 text-lg uppercase tracking-widest text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The requested asset portal page does not exist.</p>
        <Link to="/" className="btn-primary mt-6 inline-block">
          Return to dashboard
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-sm text-accent">Loading workspace...</div>}>
      <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route path="assets" element={<MenuAccessRoute accessKey="all-assets"><Assets /></MenuAccessRoute>} />
        <Route path="assets/new" element={<MenuAccessRoute accessKey="add-asset"><AssetForm /></MenuAccessRoute>} />
        <Route path="assets/:id/edit" element={<MenuAccessRoute accessKey="add-asset"><AssetForm /></MenuAccessRoute>} />
        <Route path="assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
        <Route path="assignments" element={<MenuAccessRoute accessKey="assignments"><Assignments /></MenuAccessRoute>} />
        <Route path="maintenance" element={<MenuAccessRoute accessKey="maintenance"><Maintenance /></MenuAccessRoute>} />
        <Route path="accessories" element={<MenuAccessRoute accessKey="accessories"><Accessories /></MenuAccessRoute>} />
        <Route path="consumables" element={<MenuAccessRoute accessKey="consumables"><Consumables /></MenuAccessRoute>} />
        <Route path="licenses" element={<MenuAccessRoute accessKey="licenses"><Licenses /></MenuAccessRoute>} />
        <Route path="profile" element={<Profile />} />
        <Route path="users" element={<MenuAccessRoute accessKey="all-users"><Users /></MenuAccessRoute>} />
        <Route path="my-assets" element={<MenuAccessRoute accessKey="my-assets"><UserDashboard /></MenuAccessRoute>} />
        <Route path="requestable-items" element={<MenuAccessRoute accessKey="requestable-items"><RequestableItems /></MenuAccessRoute>} />
        <Route path="super-dashboard" element={<SuperOnlyRoute />} />
        <Route path="reports" element={<MenuAccessRoute accessKey="reports"><Reports /></MenuAccessRoute>} />
        <Route path="requirements" element={<MenuAccessRoute accessKey="requirements"><Requirements /></MenuAccessRoute>} />
        <Route path="audit-log" element={<MenuAccessRoute accessKey="audit-log"><AuditLog /></MenuAccessRoute>} />
        <Route path="documents" element={<MenuAccessRoute accessKey="documents"><Documents /></MenuAccessRoute>} />
        <Route path="scan" element={<MenuAccessRoute accessKey="scan-asset"><Scan /></MenuAccessRoute>} />
        <Route path="components" element={<MenuAccessRoute accessKey="components"><ResourcePage kind="components" /></MenuAccessRoute>} />
        <Route path="kits" element={<MenuAccessRoute accessKey="kits"><ResourcePage kind="kits" /></MenuAccessRoute>} />
        <Route path="import" element={<MenuAccessRoute accessKey="import"><Import /></MenuAccessRoute>} />
        <Route path="calendar" element={<MenuAccessRoute accessKey="calendar"><Calendar /></MenuAccessRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}