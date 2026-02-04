import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import LoginPage from '@/pages/Login';
import PortalPage from '@/pages/Portal';
import UpdatePasswordPage from '@/pages/UpdatePassword';

import AdminLayout from '@/layouts/AdminLayout';
import PractitionerLayout from '@/layouts/PractitionerLayout';
import UsersPage from '@/pages/admin/Users';
import PortfoliosPage from '@/pages/admin/Portfolios';
import PatientsPage from '@/pages/admin/Patients';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { session, role, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect based on actual role if they try to access unauthorized pages
    // For simplicity, just redirect to their home or root
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />

        {/* Practitioner Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['practitioner']}>
              <PractitionerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/portfolios" replace />} />
          <Route path="portfolios" element={<PortfoliosPage />} />
          <Route path="portfolios/:id" element={<PortfoliosPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientsPage />} />
          <Route path="*" element={<Navigate to="/dashboard/portfolios" replace />} />
        </Route>

        {/* Super Admin Panel */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="portfolios" element={<PortfoliosPage />} />
          <Route path="portfolios/:id" element={<PortfoliosPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:id" element={<PatientsPage />} />
          <Route path="*" element={<Navigate to="/admin/users" replace />} />
        </Route>

        {/* Patient Portal */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PortalPage />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<RootRedirect />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { session, role, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>;
  }

  if (session) {
    if (role === 'super_admin') {
      return <Navigate to="/admin/users" replace />;
    }
    if (role === 'practitioner') {
      return <Navigate to="/dashboard" replace />;
    }
    if (role === 'patient') {
      return <Navigate to="/portal" replace />;
    }
  }

  return <Navigate to="/login" replace />;
}

export default App;
