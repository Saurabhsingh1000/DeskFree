import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import RoomsPage from './pages/RoomsPage';
import RoomDetailPage from './pages/RoomDetailPage';
import MyBookingsPage from './pages/MyBookingsPage';
import AdminPage from './pages/AdminPage';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-900 text-white flex flex-col">
      <Navbar />
      <main className="flex-1 pb-16">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <ToastContainer />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected student & admin routes */}
            <Route
              path="/rooms"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RoomsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/rooms/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <RoomDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <MyBookingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin only route */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AppLayout>
                    <AdminPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/rooms" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
