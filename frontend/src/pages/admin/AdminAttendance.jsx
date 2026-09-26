import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Check,
  X,
  Eye,
  Clock,
  Filter,
  Layers,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ExportReports } from '../../components/common/ExportReports';

export function AdminAttendance() {
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Override/Verify Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [overrideModal, setOverrideModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const [attRes, crsRes, batRes, trnRes] = await Promise.all([
        api.getAdminAllAttendance(),
        api.getCourses(),
        api.getBatches(),
        api.getTrainers()
      ]);

      if (attRes.success) setRecords(attRes.data || []);
      if (crsRes.success) setCourses(crsRes.data || []);
      if (batRes.success) setBatches(batRes.data || []);
      if (trnRes.success) setTrainers(trnRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load master attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleAdminVerify = async (id) => {
    try {
      const res = await api.verifyAttendance(id);
      if (res.success) {
        toast.success('Attendance verified by Admin.', 'Verified');
        fetchRecords();
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed.');
    }
  };

  const handleAdminReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.warning('Please enter rejection reason.');
      return;
    }
    setProcessing(true);
    try {
      const res = await api.rejectAttendance(overrideModal.id, rejectionReason);
      if (res.success) {
        toast.info('Attendance marked rejected.', 'Rejected');
        setOverrideModal(null);
        setRejectionReason('');
        fetchRecords();
      }
    } catch (err) {
      toast.error(err.message || 'Rejection failed.');
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    {
      header: 'Student',
      key: 'student_name',
      sortable: true,
      render: (r) => (
        <div>
          <div className="font-bold text-slate-900">{r.student_name}</div>
          <div className="text-[10px] text-slate-400 font-mono">{r.student_code}</div>
        </div>
      )
    },
    {
      header: 'Batch & Program',
      key: 'batch_name',
      sortable: true,
      render: (r) => (
        <div>
          <span className="font-semibold text-xs text-slate-800">{r.batch_name}</span>
          <div className="text-[10px] text-slate-400">{r.course_name}</div>
        </div>
      )
    },
    {
      header: 'Assigned Trainer',
      key: 'trainer_name',
      sortable: true,
      render: (r) => <span className="font-medium text-xs text-indigo-700">{r.trainer_name || 'Unassigned'}</span>
    },
    {
      header: 'Date',
      key: 'date',
      sortable: true,
      render: (r) => <span className="text-xs font-mono text-slate-600">{r.date}</span>
    },
    {
      header: 'Session',
      key: 'session',
      render: (r) => <span className="text-xs text-slate-800 font-medium">{r.session}</span>
    },
    {
      header: 'Check-In',
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
        <div className="flex items-center gap-1">
          {r.status === 'Pending Verification' && (
            <>
              <button
                onClick={() => handleAdminVerify(r.id)}
                className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="Verify Attendance"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setOverrideModal(r)}
                className="p-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                title="Reject Attendance"
              >
                <X className="w-3.5 h-3.5" />
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-indigo-600" />
            Master Attendance Oversight
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global attendance registry across all educational programs, student cohorts, and trainers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ExportReports
            title="Institutional Attendance Master Report"
            records={records}
            filename="master_attendance_registry"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        searchPlaceholder="Search student, trainer, batch, or session..."
        searchFields={['student_name', 'student_code', 'trainer_name', 'batch_name', 'course_name', 'date', 'session']}
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
        emptyMessage="No attendance records found."
      />

      {/* Reject/Override Modal */}
      {overrideModal && (
        <Modal
          isOpen={!!overrideModal}
          onClose={() => {
            setOverrideModal(null);
            setRejectionReason('');
          }}
          title="Admin Attendance Rejection / Override"
          subtitle={`Student: ${overrideModal.student_name} (${overrideModal.student_code}) • Date: ${overrideModal.date}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleAdminReject} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                rows="3"
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for administrative rejection or override..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOverrideModal(null);
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
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Record Details */}
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
                <div className="font-bold text-slate-900 text-sm">{selectedRecord.student_name}</div>
                <div className="text-slate-400 font-mono text-[11px]">{selectedRecord.student_code} • {selectedRecord.student_email}</div>
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
                <span className="text-slate-400 font-medium">Session:</span>
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

            {selectedRecord.rejection_reason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-rose-800 font-bold">Rejection Reason:</span>
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
