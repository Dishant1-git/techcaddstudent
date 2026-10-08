import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Auth Page
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAttendance } from './pages/student/StudentAttendance';
import { StudentComplaints } from './pages/student/StudentComplaints';
import { StudentProfile } from './pages/student/StudentProfile';

// Trainer Pages
import { TrainerDashboard } from './pages/trainer/TrainerDashboard';
import { TrainerVerifications } from './pages/trainer/TrainerVerifications';
import { TrainerStudents } from './pages/trainer/TrainerStudents';
import { TrainerReports } from './pages/trainer/TrainerReports';
import { TrainerProfile } from './pages/trainer/TrainerProfile';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminTrainers } from './pages/admin/AdminTrainers';
import { AdminCourses } from './pages/admin/AdminCourses';
import { AdminBatches } from './pages/admin/AdminBatches';
import { AdminAttendance } from './pages/admin/AdminAttendance';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminComplaints } from './pages/admin/AdminComplaints';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminSettings } from './pages/admin/AdminSettings';

// Shared
import { NotificationsPage } from './pages/common/NotificationsPage';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-300">Loading secure portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to own dashboard if trying to access unauthorized route
    return <Navigate to={`/${role}`} replace />;
  }

  return children;
}

function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${role}`} replace />;
}

export function App() {
  return (
    <Routes>
      {/* Public Login */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Root Redirection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Student Portal */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRoles={['student']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="complaints" element={<StudentComplaints />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Trainer Portal */}
      <Route
        path="/trainer"
        element={
          <ProtectedRoute allowedRoles={['trainer']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TrainerDashboard />} />
        <Route path="verifications" element={<TrainerVerifications />} />
        <Route path="students" element={<TrainerStudents />} />
        <Route path="reports" element={<TrainerReports />} />
        <Route path="profile" element={<TrainerProfile />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="trainers" element={<AdminTrainers />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="batches" element={<AdminBatches />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
