// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';

import DashboardLayout from './components/layout/DashboardLayout';

import Dashboard from './pages/Dashboard';
import MyCourses from './pages/MyCourses';
import ExploreCourses from './pages/ExploreCourses';
import PaymentHistory from './pages/PaymentHistory';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';
import ProfileSetup from './pages/ProfileSetup';
import ChangePassword from './pages/ChangePassword';
import CourseReader from './pages/CourseReader';
import CourseDetail from './pages/CourseDetail';
import EmailVerification from './pages/EmailVerification';
import Payment from './pages/Payment';

const queryClient = new QueryClient();

/* ---------------- ROOT REDIRECT ---------------- */

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to='/auth' replace />;

  // Role-based bypass
  if (['admin', 'owner', 'developer'].includes(user.role)) {
    return <Navigate to='/dashboard' replace />;
  }

  return user.isPaidUser ? (
    <Navigate to='/dashboard' replace />
  ) : (
    <Navigate to='/payment' replace />
  );
};

/* ---------------- PAYMENT GUARD ---------------- */

const PaymentGuard = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to='/auth' replace />;

  if (['admin', 'owner', 'developer'].includes(user.role)) {
    return children;
  }

  if (!user.isPaidUser) {
    return <Navigate to='/payment' replace />;
  }

  return children;
};

/* ---------------- APP ---------------- */

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              {/* Root */}
              <Route path='/' element={<RootRedirect />} />

              {/* Auth */}
              <Route path='/auth' element={<Auth />} />

              {/* Payment */}
              <Route path='/payment' element={<Payment />} />

              {/* Dashboard (PAYMENT PROTECTED) */}
              <Route
                path='/dashboard'
                element={
                  <PaymentGuard>
                    <DashboardLayout />
                  </PaymentGuard>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path='profile-setup' element={<ProfileSetup />} />
                <Route path='my-courses' element={<MyCourses />} />
                <Route path='explore' element={<ExploreCourses />} />
                <Route path='payments' element={<PaymentHistory />} />
                <Route path='profile' element={<Profile />} />
                <Route path='change-password' element={<ChangePassword />} />
                <Route
                  path='email-verification'
                  element={<EmailVerification />}
                />
                <Route
                  path='course-detail/:courseId'
                  element={<CourseDetail />}
                />
                <Route path='course/:courseId' element={<CourseReader />} />
              </Route>

              {/* 404 */}
              <Route path='*' element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
