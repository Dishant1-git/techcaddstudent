import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Eye,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AttendanceGauge } from '../../components/common/AttendanceGauge';
import { Modal } from '../../components/common/Modal';
import { ExportReports } from '../../components/common/ExportReports';

export function StudentAttendance() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    attended: 0,
    pending: 0,
    missed: 0,
    attendancePercentage: 100
  });
  const [loading, setLoading] = useState(true);

  // Mark Modal
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [session, setSession] = useState('Morning Lecture');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.getMyAttendance();
      if (res.success) {
        setRecords(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
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
        toast.success(res.message, 'Check-In Recorded');
        setShowMarkModal(false);
        setNotes('');
        fetchAttendance();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Date',
      key: 'date',
      sortable: true,
      render: (r) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {r.date}
        </div>
      )
    },
    {
      header: 'Class / Session',
      key: 'session',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-bold text-slate-800">{r.session}</span>
          <div className="text-[11px] text-slate-400">{r.batch_name}</div>
        </div>
      )
    },
    {
      header: 'Check-In Time',
      key: 'check_in_time',
      render: (r) => <span className="font-mono text-xs text-slate-700">{r.check_in_time}</span>
    },
    {
      header: 'Attendance Status',
      key: 'status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Verified By',
      key: 'trainer_name',
      render: (r) => (
        <span className="text-xs text-slate-600">
          {r.trainer_name || r.verified_by_name || '—'}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <button
          onClick={() => setSelectedRecord(r)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            My Attendance Record
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Program: <strong>{profile?.course_name || 'Enrolled Course'}</strong> • Batch: <strong>{profile?.batch_name || 'Assigned Batch'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportReports
            title={`Attendance Report - ${user?.name} (${profile?.student_id})`}
            records={records}
            filename={`attendance_${profile?.student_id || 'student'}`}
            summary={{
              verifiedCount: stats.attended,
              pendingCount: stats.pending,
              rejectedCount: stats.missed,
              overallPercentage: stats.attendancePercentage
            }}
          />
          <button
            onClick={() => setShowMarkModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Mark Check-In
          </button>
        </div>
      </div>

      {/* Overview Cards & Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm items-center">
        <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
          <AttendanceGauge
            percentage={stats.attendancePercentage}
            size="lg"
            subtext="Overall Attendance Rate"
          />
        </div>

        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
            <span className="text-xs font-bold text-indigo-800 uppercase">Total Classes</span>
            <div className="text-3xl font-extrabold text-indigo-950 mt-1">{stats.totalClasses}</div>
            <span className="text-[10px] text-indigo-600">Sessions</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 text-center">
            <span className="text-xs font-bold text-emerald-800 uppercase">Attended</span>
            <div className="text-3xl font-extrabold text-emerald-950 mt-1">{stats.attended}</div>
            <span className="text-[10px] text-emerald-600">Verified</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
            <span className="text-xs font-bold text-amber-800 uppercase">Pending</span>
            <div className="text-3xl font-extrabold text-amber-950 mt-1">{stats.pending}</div>
            <span className="text-[10px] text-amber-600">Awaiting Trainer</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 text-center">
            <span className="text-xs font-bold text-rose-800 uppercase">Missed/Rejected</span>
            <div className="text-3xl font-extrabold text-rose-950 mt-1">{stats.missed}</div>
            <span className="text-[10px] text-rose-600">Unexcused</span>
          </div>
        </div>
      </div>

      {/* Attendance Records Data Table */}
      <DataTable
        columns={columns}
        data={records}
        searchPlaceholder="Search session or date..."
        searchFields={['session', 'date', 'trainer_name']}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'Verified', label: 'Verified' },
              { value: 'Pending Verification', label: 'Pending Verification' },
              { value: 'Rejected', label: 'Rejected' }
            ]
          }
        ]}
        emptyMessage="No attendance records found matching criteria."
      />

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={showMarkModal}
        onClose={() => setShowMarkModal(false)}
        title="Mark Class Attendance"
        subtitle={`Session Date: ${new Date().toISOString().split('T')[0]} | Batch: ${profile?.batch_name || 'Assigned Batch'}`}
      >
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Attendance Approval Policy
            </div>
            <p className="text-indigo-700/90 leading-relaxed">
              Your attendance status will be submitted as <strong>Pending Verification</strong>. Your assigned trainer (<strong>{profile?.trainer_name || 'Trainer'}</strong>) will review and verify your record.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Class / Session
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
              Optional Student Remarks
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Present on time, completed laboratory assignment #4"
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
              {submitting ? 'Submitting...' : 'Submit Attendance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Attendance Record Details"
          subtitle={`Record ID: #${selectedRecord.id} • ${selectedRecord.date}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="font-semibold text-slate-600">Verification Status:</span>
              <StatusBadge status={selectedRecord.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Session:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedRecord.session}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Check-In Time:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{selectedRecord.check_in_time}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Course Program:</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRecord.course_name}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Assigned Batch:</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRecord.batch_name}</p>
              </div>
            </div>

            {selectedRecord.verified_by_name && (
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-emerald-800 font-semibold">Verified By Trainer:</span>
                <p className="font-bold text-emerald-950 text-sm mt-0.5">{selectedRecord.verified_by_name}</p>
                {selectedRecord.verification_time && (
                  <span className="text-[11px] text-emerald-700 font-mono">
                    Timestamp: {new Date(selectedRecord.verification_time).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {selectedRecord.status === 'Rejected' && selectedRecord.rejection_reason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-rose-800 font-bold">Trainer Rejection Reason:</span>
                <p className="text-rose-950 mt-1 leading-relaxed">{selectedRecord.rejection_reason}</p>
              </div>
            )}

            {selectedRecord.notes && (
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Student Note:</span>
                <p className="text-slate-700 mt-0.5">{selectedRecord.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
