import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import AuthLayout from './features/auth/AuthLayout';
import Dashboard from './pages/Dashboard';

function ProtectedRoute({ children }) {
  const { isAuthenticated, initialLoading } = useAuth();

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fbfaf7' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--cyan)' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

// Starting screen redirect: Shows Welcome page at start for everyone not logged in
function RootRedirect() {
  const { isAuthenticated, initialLoading } = useAuth();

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fbfaf7' }}>
        <div className="spinner" style={{ borderTopColor: 'var(--cyan)' }} />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/welcome" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <BrowserRouter>
          <Routes>
            {/* Starting at '/' shows Welcome screen for everyone unless already logged in */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/welcome" element={<AuthLayout />} />
            <Route path="/login" element={<AuthLayout />} />
            <Route path="/signup" element={<AuthLayout />} />
            <Route path="/forgot-password" element={<AuthLayout />} />
            <Route path="/reset-password/:token" element={<AuthLayout />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}
