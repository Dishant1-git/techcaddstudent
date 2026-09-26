import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  Users,
  Layers,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';

export function TrainerDashboard() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [rejectingRecord, setRejectingRecord] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getTrainerAnalytics();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trainer dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleVerify = async (id) => {
    try {
      const res = await api.verifyAttendance(id);
      if (res.success) {
        toast.success(res.message, 'Attendance Verified');
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to verify attendance.');
    }
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a reason for rejecting attendance.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.rejectAttendance(rejectingRecord.id, rejectionReason);
      if (res.success) {
        toast.info(res.message, 'Attendance Rejected');
        setRejectingRecord(null);
        setRejectionReason('');
        fetchDashboard();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject attendance.');
    } finally {
      setProcessing(false);
    }
  };

  const cards = data?.cards || {
    assignedBatches: 0,
    assignedCourses: 0,
    assignedStudents: 0,
    todayClasses: 0,
    todayAttendance: 0,
    pendingVerifications: 0,
    verifiedTotal: 0,
    rejectedTotal: 0,
    attendancePercentage: 100
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-200 border border-white/10 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              Trainer Command Center
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name}!
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Specialization: <strong>{profile?.specialization || 'Technical Instructor'}</strong> • ID: <strong>{profile?.trainer_id || 'TRN-101'}</strong>
            </p>
          </div>

          <Link
            to="/trainer/verifications"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <FileCheck2 className="w-4 h-4" />
            Review Pending Verifications ({cards.pendingVerifications})
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Batches"
          value={cards.assignedBatches}
          icon={Layers}
          accent="indigo"
          description="Active cohorts under your instruction"
        />
        <StatCard
          title="Assigned Students"
          value={cards.assignedStudents}
          icon={Users}
          accent="sky"
          description="Enrolled in your batches"
        />
        <StatCard
          title="Pending Verification"
          value={cards.pendingVerifications}
          icon={Clock}
          accent={cards.pendingVerifications > 0 ? "amber" : "emerald"}
          description={cards.pendingVerifications > 0 ? "Requires your review today" : "All verifications up to date"}
        />
        <StatCard
          title="Attendance Rate"
          value={`${cards.attendancePercentage}%`}
          icon={CheckCircle2}
          accent="emerald"
          description="Verified attendance ratio"
        />
      </div>

      {/* Main Grid: Pending Action Table & Assigned Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pending Verifications Widget (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                  Pending Attendance Verifications
                </h2>
                {cards.pendingVerifications > 0 && (
                  <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {cards.pendingVerifications} Pending
                  </span>
                )}
              </div>

              <Link
                to="/trainer/verifications"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                All Verifications <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto">
              {data?.pendingRecords?.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 font-semibold border-b border-slate-100 pb-2">
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Session</th>
                      <th className="py-2.5 px-3">Check-In</th>
                      <th className="py-2.5 px-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.pendingRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{rec.student_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{rec.student_code} • {rec.batch_name}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{rec.session}</div>
                          <div className="text-[10px] text-slate-400">{rec.date}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-700">
                          {rec.check_in_time}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleVerify(rec.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm shadow-emerald-500/20 flex items-center gap-1 transition-all"
                              title="Verify Attendance"
                            >
                              <Check className="w-3.5 h-3.5" /> Verify
                            </button>
                            <button
                              onClick={() => setRejectingRecord(rec)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 flex items-center gap-1 transition-all"
                              title="Reject Attendance"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-slate-700">All Attendance Verified</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No pending attendance verifications for your assigned batches.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Assigned Batches (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Assigned Batches
            </h2>

            <div className="space-y-3">
              {data?.todayBatches?.length > 0 ? (
                data.todayBatches.map((batch) => (
                  <div key={batch.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-slate-900">{batch.batch_name}</h4>
                      <StatusBadge status={batch.status} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{batch.schedule_time}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200/60">
                      <span>Max Capacity: {batch.max_students}</span>
                      <Link to="/trainer/students" className="text-indigo-600 font-semibold hover:underline">
                        View Students →
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No active batches assigned.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Attendance Modal */}
      {rejectingRecord && (
        <Modal
          isOpen={!!rejectingRecord}
          onClose={() => {
            setRejectingRecord(null);
            setRejectionReason('');
          }}
          title="Reject Attendance Record"
          subtitle={`Student: ${rejectingRecord.student_name} (${rejectingRecord.student_code}) • Session: ${rejectingRecord.session}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRejectConfirm} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Mandatory Rejection Reason
              </div>
              <p className="text-rose-800 leading-relaxed">
                Please specify why this attendance is being rejected (e.g., student checked in late, left early, or was absent). The student will be notified with this reason.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                rows="3"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Left practical session 45 minutes early without prior permission."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectingRecord(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {processing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
