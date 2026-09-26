import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Check,
  X,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ExportReports } from '../../components/common/ExportReports';

export function TrainerVerifications() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reject Modal
  const [rejectingRecord, setRejectingRecord] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // View Details Modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getTrainerAllAttendance();
      if (res.success) {
        setRecords(res.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleVerify = async (record) => {
    try {
      const res = await api.verifyAttendance(record.id);
      if (res.success) {
        toast.success(`Verified attendance for ${record.student_name}.`, 'Attendance Verified');
        fetchRecords();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to verify attendance.');
    }
  };

  const handleRejectConfirm = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.warning('A reason for rejection is required.');
      return;
    }

    setSubmittingReject(true);
    try {
      const res = await api.rejectAttendance(rejectingRecord.id, rejectionReason);
      if (res.success) {
        toast.info(`Attendance rejected for ${rejectingRecord.student_name}.`, 'Attendance Rejected');
        setRejectingRecord(null);
        setRejectionReason('');
        fetchRecords();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reject attendance.');
    } finally {
      setSubmittingReject(false);
    }
  };

  const pendingCount = records.filter(r => r.status === 'Pending Verification').length;
  const verifiedCount = records.filter(r => r.status === 'Verified').length;
  const rejectedCount = records.filter(r => r.status === 'Rejected').length;

  const columns = [
    {
      header: 'Student',
      key: 'student_name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900">{r.student_name}</div>
          <div className="text-[11px] text-slate-400 font-mono">{r.student_email}</div>
        </div>
      )
    },
    {
      header: 'Student ID',
      key: 'student_code',
      sortable: true,
      render: (r) => <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">{r.student_code}</span>
    },
    {
      header: 'Batch',
      key: 'batch_name',
      sortable: true,
      render: (r) => <span className="font-semibold text-slate-700 text-xs">{r.batch_name}</span>
    },
    {
      header: 'Date',
      key: 'date',
      sortable: true,
      render: (r) => <span className="text-xs text-slate-600 font-medium">{r.date}</span>
    },
    {
      header: 'Session',
      key: 'session',
      render: (r) => <span className="font-medium text-slate-800 text-xs">{r.session}</span>
    },
    {
      header: 'Check-In Time',
      key: 'check_in_time',
      render: (r) => <span className="font-mono text-xs text-slate-700">{r.check_in_time}</span>
    },
    {
      header: 'Status',
      key: 'status',
      sortable: true,
      render: (r) => <StatusBadge status={r.status} />
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === 'Pending Verification' && (
            <>
              <button
                onClick={() => handleVerify(r)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm shadow-emerald-500/20 flex items-center gap-1 transition-all"
                title="Verify Attendance"
              >
                <Check className="w-3.5 h-3.5" /> Verify
              </button>
              <button
                onClick={() => setRejectingRecord(r)}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 flex items-center gap-1 transition-all"
                title="Reject Attendance"
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}

          <button
            onClick={() => setSelectedRecord(r)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-indigo-600" />
            Attendance Verification Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review, verify, or reject attendance submissions strictly from your assigned cohorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportReports
            title={`Assigned Attendance Verification Report - Trainer ${user?.name}`}
            records={records}
            filename="trainer_attendance_verifications"
          />
        </div>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase">Pending Review</div>
              <div className="text-2xl font-extrabold text-amber-950 mt-0.5">{pendingCount}</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            Action Required
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900 uppercase">Total Verified</div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-0.5">{verifiedCount}</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Approved
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900 uppercase">Rejected</div>
              <div className="text-2xl font-extrabold text-rose-950 mt-0.5">{rejectedCount}</div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
            Unexcused
          </span>
        </div>
      </div>

      {/* Verification Data Table */}
      <DataTable
        columns={columns}
        data={records}
        searchPlaceholder="Search student name, ID, or session..."
        searchFields={['student_name', 'student_code', 'student_email', 'session', 'batch_name', 'date']}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'Pending Verification', label: 'Pending Verification' },
              { value: 'Verified', label: 'Verified' },
              { value: 'Rejected', label: 'Rejected' }
            ]
          }
        ]}
        emptyMessage="No attendance records found for your assigned students."
      />

      {/* Reject Modal */}
      {rejectingRecord && (
        <Modal
          isOpen={!!rejectingRecord}
          onClose={() => {
            setRejectingRecord(null);
            setRejectionReason('');
          }}
          title="Reject Attendance Submission"
          subtitle={`Student: ${rejectingRecord.student_name} (${rejectingRecord.student_code}) • Date: ${rejectingRecord.date}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRejectConfirm} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                Reason Required
              </div>
              <p className="text-rose-800 leading-relaxed">
                Please enter a clear explanation for rejecting this attendance. The student will be informed immediately.
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
                placeholder="e.g. Checked in more than 90 minutes after class commencement."
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
                disabled={submittingReject}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingReject ? 'Rejecting...' : 'Reject Attendance'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedRecord && (
        <Modal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title="Attendance Record Details"
          subtitle={`Record ID: #${selectedRecord.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div>
                <span className="text-slate-400 font-medium">Student Name:</span>
                <p className="font-bold text-slate-900 text-sm">{selectedRecord.student_name}</p>
                <span className="font-mono text-[11px] text-slate-500">{selectedRecord.student_code} • {selectedRecord.student_email}</span>
              </div>
              <StatusBadge status={selectedRecord.status} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Batch:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedRecord.batch_name}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Date & Time:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5 font-mono">{selectedRecord.date} at {selectedRecord.check_in_time}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Class Session:</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRecord.session}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 font-medium">Program:</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedRecord.course_name}</p>
              </div>
            </div>

            {selectedRecord.verified_by_name && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-800 font-semibold">Verification Audit:</span>
                <p className="font-bold text-emerald-950 text-sm mt-0.5">Verified by {selectedRecord.verified_by_name}</p>
                {selectedRecord.verification_time && (
                  <span className="text-[11px] text-emerald-700 font-mono block mt-1">
                    Timestamp: {new Date(selectedRecord.verification_time).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {selectedRecord.status === 'Rejected' && selectedRecord.rejection_reason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-rose-800 font-bold">Recorded Rejection Reason:</span>
                <p className="text-rose-950 mt-1 leading-relaxed">{selectedRecord.rejection_reason}</p>
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
