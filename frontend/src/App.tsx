// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';

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

// Lazy load TutoringSessions
const TutoringSessions = lazy(() => import('./pages/TutoringSessions'));

const queryClient = new QueryClient();

/* ---------------- LOADING COMPONENT ---------------- */
const LoadingSpinner = () => (
  <div className='min-h-screen flex items-center justify-center bg-background'>
    <div className='text-center'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
      <p className='text-muted-foreground'>Loading...</p>
    </div>
  </div>
);

/* ---------------- ROOT REDIRECT ---------------- */
const RootRedirect = () => {
  const { user, loading, initialized } = useAuth();

  // Show loading while auth is initializing
  if (loading || !initialized) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to='/auth' replace />;
  }

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
  const { user, loading, initialized } = useAuth();
  const isPaid = localStorage.getItem('is_paid') === 'true';

  // Show loading while auth is initializing
  if (loading || !initialized) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to='/auth' replace />;
  }

  // Role-based bypass
  if (['admin', 'owner', 'developer'].includes(user.role)) {
    return children;
  }

  // Check payment status for MAIN COURSE (tutoring is separate)
  if (!isPaid && !user.isPaidUser) {
    return <Navigate to='/payment' replace />;
  }

  return children;
};

/* ---------------- TUTORING GUARD ---------------- */
const TutoringGuard = ({ children }: { children: JSX.Element }) => {
  const { user, loading, initialized } = useAuth();

  // Show loading while auth is initializing
  if (loading || !initialized) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to='/auth' replace />;
  }

  // Role-based bypass
  if (['admin', 'owner', 'developer'].includes(user.role)) {
    return children;
  }

  // Check if user has purchased main course first
  const isPaid = localStorage.getItem('is_paid') === 'true';
  if (!isPaid && !user.isPaidUser) {
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
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Root */}
                <Route path='/' element={<RootRedirect />} />

                {/* Auth */}
                <Route path='/auth' element={<Auth />} />

                {/* Payment */}
                <Route
                  path='/payment'
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <Payment />
                    </Suspense>
                  }
                />

                {/* Dashboard (PAYMENT PROTECTED - MAIN COURSE REQUIRED) */}
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
                  <Route
                    path='tutoring-sessions'
                    element={
                      <TutoringGuard>
                        <Suspense fallback={<LoadingSpinner />}>
                          <TutoringSessions />
                        </Suspense>
                      </TutoringGuard>
                    }
                  />
                </Route>

                {/* 404 */}
                <Route path='*' element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
