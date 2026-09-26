import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  BookOpen,
  User,
  Phone,
  Mail,
  Plus,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { AttendanceGauge } from '../../components/common/AttendanceGauge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export function StudentDashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mark Attendance Modal State
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [session, setSession] = useState('Morning Lecture');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getStudentAnalytics();
      if (res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.markAttendance({
        session,
        notes
      });
      if (res.success) {
        toast.success(res.message, 'Attendance Submitted');
        setShowMarkModal(false);
        setNotes('');
        fetchDashboard();
        refreshProfile();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const student = profile || dashboardData?.profile;
  const stats = dashboardData?.stats || student?.stats || {
    totalClasses: 0,
    attended: 0,
    pending: 0,
    missed: 0,
    attendancePercentage: 100
  };
  const todayAttendance = dashboardData?.todayAttendance || [];
  const todayMarked = todayAttendance.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Student Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-xl">
              Track your daily class attendance, review verification statuses, and report any institute complaints privately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowMarkModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-950 font-bold text-sm hover:bg-indigo-50 shadow-lg shadow-black/10 transition-all hover:scale-105 cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              Mark Attendance Today
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Profile & Today's Attendance (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Student Profile Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Student Profile
              </h2>
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                {student?.student_id || 'STU-PENDING'}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user?.name || 'User')}`}
                alt={user?.name}
                className="w-16 h-16 rounded-2xl bg-slate-100 object-cover ring-2 ring-indigo-500/20"
              />
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900 truncate">{user?.name}</h3>
                <p className="text-xs text-slate-500 font-mono truncate">{user?.email}</p>
                <div className="mt-1">
                  <StatusBadge status={student?.status || 'active'} />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Program / Course</span>
                <span className="font-semibold text-slate-800 text-right">{student?.course_name || 'Enrolled Course'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Assigned Batch</span>
                <span className="font-semibold text-slate-800">{student?.batch_name || 'Assigned Batch'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Assigned Trainer</span>
                <span className="font-bold text-indigo-700">{student?.trainer_name || 'Assigned Trainer'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Trainer Contact</span>
                <span className="font-mono text-slate-600">{student?.trainer_email || 'trainer@portal.edu'}</span>
              </div>
            </div>
          </div>

          {/* Today's Attendance Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Today's Attendance Status
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {todayMarked ? (
              <div className="space-y-3">
                {todayAttendance.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{rec.session}</span>
                      <StatusBadge status={rec.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Check-In: <strong className="text-slate-700">{rec.check_in_time}</strong></span>
                      <span>Batch: <strong className="text-slate-700">{rec.batch_name}</strong></span>
                    </div>

                    {rec.status === 'Pending Verification' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>Submitted! Your assigned trainer ({student?.trainer_name}) will verify your attendance shortly.</span>
                      </div>
                    )}

                    {rec.status === 'Rejected' && rec.rejection_reason && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                        <strong>Rejection Reason:</strong> {rec.rejection_reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-xs text-slate-800">Attendance Not Marked Yet</h4>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">
                  Please mark your check-in time for today's class session.
                </p>
                <button
                  onClick={() => setShowMarkModal(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
                >
                  Mark Check-In Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Analytics & Recent History (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Attendance Progress Overview */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Attendance Progress
                </h2>
                <p className="text-xs text-slate-400">Institutional minimum requirement: 75%</p>
              </div>
              <Link
                to="/student/attendance"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Full History <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* Gauge (5 cols) */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center bg-slate-50/60 rounded-2xl p-2 border border-slate-100">
                <AttendanceGauge
                  percentage={stats.attendancePercentage}
                  size="md"
                  subtext="Attendance Compliance"
                />
              </div>

              {/* Stat Counters (7 cols) */}
              <div className="sm:col-span-7 grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-[11px] font-semibold text-indigo-700 uppercase">Total Classes</span>
                  <div className="text-2xl font-extrabold text-indigo-950 mt-1">{stats.totalClasses}</div>
                  <span className="text-[10px] text-indigo-600">Recorded sessions</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase">Attended</span>
                  <div className="text-2xl font-extrabold text-emerald-950 mt-1">{stats.attended}</div>
                  <span className="text-[10px] text-emerald-600">Verified by Trainer</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending</span>
                  <div className="text-2xl font-extrabold text-amber-950 mt-1">{stats.pending}</div>
                  <span className="text-[10px] text-amber-600">Awaiting review</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase">Missed/Rejected</span>
                  <div className="text-2xl font-extrabold text-rose-950 mt-1">{stats.missed}</div>
                  <span className="text-[10px] text-rose-600">Unexcused / Rejected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attendance Records */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Recent Attendance Logs
              </h2>
              <Link
                to="/student/attendance"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                View all
              </Link>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {dashboardData?.recentAttendance?.length > 0 ? (
                dashboardData.recentAttendance.map((rec) => (
                  <div key={rec.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{rec.session}</div>
                      <div className="text-slate-400 mt-0.5">
                        {rec.date} • {rec.check_in_time}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <StatusBadge status={rec.status} />
                      {rec.verified_by_name && (
                        <span className="text-[10px] text-slate-400">
                          by {rec.verified_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No previous attendance records found.
                </div>
              )}
            </div>
          </div>

          {/* Complaints Summary Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                <AlertOctagon className="w-4 h-4" />
                Grievance & Complaint System
              </div>
              <h3 className="text-base font-bold text-white">Have an issue or technical inquiry?</h3>
              <p className="text-slate-300 text-xs mt-0.5">
                Submit a confidential grievance directly to the Administration.
              </p>
            </div>
            <Link
              to="/student/complaints"
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md border border-white/20 whitespace-nowrap transition-all"
            >
              Report Grievance
            </Link>
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="Mark Today's Attendance"
        subtitle={`Student: ${user?.name} (${student?.student_id || 'STU-ID'}) | Date: ${new Date().toISOString().split('T')[0]}`}
      >
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Verification Workflow
            </div>
            <p className="text-indigo-700/90 leading-relaxed">
              When you submit, your attendance is set to <strong>Pending Verification</strong> and forwarded to your assigned trainer (<strong>{student?.trainer_name || 'Assigned Trainer'}</strong>) for verification.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Class Session
            </label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
            >
              <option value="Morning Lecture">Morning Lecture (09:00 AM - 12:00 PM)</option>
              <option value="Afternoon Lab">Afternoon Practical Lab (01:30 PM - 04:30 PM)</option>
              <option value="Evening Discussion">Evening Discussion (05:30 PM - 08:30 PM)</option>
              <option value="Special Seminar">Special Seminar / Workshop</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Optional Note / Comments
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Completed React Router lab exercises in Room 302"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowMarkModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Confirm Check-In'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
